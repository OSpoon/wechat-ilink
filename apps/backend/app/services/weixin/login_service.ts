import { randomUUID } from 'node:crypto'
import env from '#start/env'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import WeixinAccount from '#models/weixin_account'
import WeixinLoginSession from '#models/weixin_login_session'
import ILinkClient, { DEFAULT_ILINK_BASE_URL } from './ilink_client.js'
import { accountToken, saveConfirmedAccount } from './account_service.js'

const QR_TTL_MINUTES = 5
const MAX_REFRESHES = 3
const QR_POLL_RETRY_MESSAGE = 'Unable to check QR login status; retrying.'
const verifyCodes = new Map<string, string>()
const runningSessions = new Set<string>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function startLogin(userId: number) {
  const baseUrl = env.get('ILINK_BASE_URL', DEFAULT_ILINK_BASE_URL)
  const client = new ILinkClient({ baseUrl })
  const localTokenList = await localBotTokenList(userId)
  const botType = env.get('ILINK_BOT_TYPE')
  const qr = await client.getBotQrCode(botType, localTokenList)
  const session = await WeixinLoginSession.create({
    id: `wxlogin_${randomUUID()}`,
    userId,
    qrcode: qr.qrcode,
    qrcodeUrl: qr.qrcode_img_content,
    status: 'waiting_scan',
    botType,
    pollingBaseUrl: baseUrl,
    expiresAt: DateTime.local().plus({ minutes: QR_TTL_MINUTES }),
  })

  void pollLogin(session.id)
  return session
}

export async function submitVerifyCode(userId: number, sessionId: string, code: string) {
  const session = await ownedSession(userId, sessionId)
  if (!session) return null
  if (session.status !== 'need_verifycode') {
    const error = new Error('This login session is not waiting for a verify code')
    Object.assign(error, { status: 409, code: 'LOGIN_SESSION_NOT_WAITING' })
    throw error
  }
  const normalized = code.trim()
  if (!/^\d{1,8}$/.test(normalized)) {
    const error = new Error('verify code must contain 1 to 8 digits')
    Object.assign(error, { status: 422, code: 'INVALID_VERIFY_CODE' })
    throw error
  }
  verifyCodes.set(sessionId, normalized)
  await session.merge({ status: 'verifying' }).save()
  return session
}

export async function getLoginSession(userId: number, sessionId: string) {
  return ownedSession(userId, sessionId)
}

export async function cancelLogin(userId: number, sessionId: string) {
  const session = await ownedSession(userId, sessionId)
  if (!session) return null
  verifyCodes.delete(sessionId)
  await session.merge({ status: 'cancelled' }).save()
  return session
}

async function ownedSession(userId: number, sessionId: string) {
  return WeixinLoginSession.query().where('id', sessionId).where('user_id', userId).first()
}

async function pollLogin(sessionId: string) {
  if (runningSessions.has(sessionId)) return
  runningSessions.add(sessionId)

  try {
    let refreshCount = 1
    let pollFailureCount = 0
    let currentBaseUrl = env.get('ILINK_BASE_URL', DEFAULT_ILINK_BASE_URL)

    while (true) {
      const session = await WeixinLoginSession.find(sessionId)
      if (
        !session ||
        ['cancelled', 'confirmed', 'already_connected', 'failed', 'expired'].includes(
          session.status
        )
      )
        return

      if (session.expiresAt < DateTime.local()) {
        await session.merge({ status: 'expired' }).save()
        return
      }

      const verifyCode = verifyCodes.get(sessionId)
      const client = new ILinkClient({ baseUrl: currentBaseUrl })
      let status
      try {
        status = await client.getQrCodeStatus(session.qrcode, verifyCode)
      } catch (error) {
        if (session.expiresAt < DateTime.local()) {
          await session.merge({ status: 'expired' }).save()
          return
        }
        pollFailureCount += 1
        if (pollFailureCount === 1 || pollFailureCount % 10 === 0) {
          logger.warn(
            { sessionId, consecutiveFailures: pollFailureCount },
            'Failed to poll WeChat QR login status; retrying'
          )
        }
        if (pollFailureCount === 3 && session.errorMessage !== QR_POLL_RETRY_MESSAGE) {
          await session.merge({ errorMessage: QR_POLL_RETRY_MESSAGE }).save()
        }
        await sleep(1000)
        continue
      }

      if (pollFailureCount > 0) {
        pollFailureCount = 0
        if (session.errorMessage === QR_POLL_RETRY_MESSAGE) {
          await session.merge({ errorMessage: null }).save()
        }
      }

      if (verifyCode && status.status !== 'need_verifycode') verifyCodes.delete(sessionId)

      if (status.status === 'wait') {
        await session.merge({ status: 'waiting_scan' }).save()
      } else if (status.status === 'scaned' || status.status === 'scanned') {
        await session.merge({ status: 'scanned' }).save()
      } else if (status.status === 'need_verifycode') {
        await session.merge({ status: 'need_verifycode' }).save()
      } else if (status.status === 'scaned_but_redirect') {
        if (status.redirect_host) currentBaseUrl = `https://${status.redirect_host}`
        await session.merge({ status: 'scanned', pollingBaseUrl: currentBaseUrl }).save()
      } else if (status.status === 'verify_code_blocked') {
        verifyCodes.delete(sessionId)
        refreshCount += 1
        if (!(await refreshQr(session, refreshCount))) return
      } else if (status.status === 'expired') {
        refreshCount += 1
        if (!(await refreshQr(session, refreshCount))) return
      } else if (status.status === 'binded_redirect') {
        await session.merge({ status: 'already_connected' }).save()
        return
      } else if (status.status === 'confirmed') {
        if (!status.ilink_bot_id || !status.bot_token) {
          await session
            .merge({ status: 'failed', errorMessage: 'iLink confirmed without bot credentials' })
            .save()
          return
        }
        const account = await saveConfirmedAccount({
          userId: session.userId,
          providerAccountId: status.ilink_bot_id,
          ilinkUserId: status.ilink_user_id,
          botToken: status.bot_token,
          baseUrl: status.baseurl,
        })
        await session
          .merge({
            status: 'confirmed',
            accountId: account.id,
            ilinkUserId: status.ilink_user_id ?? null,
          })
          .save()
        const { connectionManager } = await import('./connection_manager.js')
        void connectionManager.startExisting(account)
        return
      }

      await sleep(1000)
    }
  } catch (error) {
    const session = await WeixinLoginSession.find(sessionId)
    if (session) {
      await session
        .merge({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'login failed',
        })
        .save()
    }
  } finally {
    verifyCodes.delete(sessionId)
    runningSessions.delete(sessionId)
  }
}

async function refreshQr(session: WeixinLoginSession, refreshCount: number) {
  if (refreshCount > MAX_REFRESHES) {
    await session.merge({ status: 'failed', errorMessage: 'QR code expired too many times' }).save()
    return false
  }
  const client = new ILinkClient({ baseUrl: env.get('ILINK_BASE_URL', DEFAULT_ILINK_BASE_URL) })
  try {
    const qr = await client.getBotQrCode(session.botType, await localBotTokenList(session.userId))
    await session
      .merge({
        qrcode: qr.qrcode,
        qrcodeUrl: qr.qrcode_img_content,
        status: 'waiting_scan',
        expiresAt: DateTime.local().plus({ minutes: QR_TTL_MINUTES }),
      })
      .save()
    return true
  } catch (error) {
    await session
      .merge({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'failed to refresh QR code',
      })
      .save()
    return false
  }
}

async function localBotTokenList(userId: number) {
  const accounts = await WeixinAccount.query()
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(10)
  return accounts.flatMap((account) => {
    try {
      const token = accountToken(account).trim()
      return token ? [token] : []
    } catch {
      return []
    }
  })
}
