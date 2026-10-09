import { randomUUID } from 'node:crypto'
import env from '#start/env'
import type WeixinAccount from '#models/weixin_account'
import type { DateTime } from 'luxon'
import type { WeixinAccountStatus } from '#contracts/weixin'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { decryptSecret, encryptSecret } from './secret_service.js'
import { DEFAULT_CDN_BASE_URL, DEFAULT_ILINK_BASE_URL } from './ilink_client.js'
import { removeLocalMediaForAccount } from './local_media_service.js'

export type PublicWeixinAccount = {
  id: string
  providerAccountId: string
  ilinkUserId: string | null
  baseUrl: string
  cdnBaseUrl: string
  status: WeixinAccountStatus
  enabled: boolean
  lastError: string | null
  lastInboundAt: DateTime | null
  lastOutboundAt: DateTime | null
  createdAt: DateTime
  updatedAt: DateTime
}

async function getWeixinAccountModel() {
  const model = await import('#models/weixin_account')
  return model.default
}

export function toPublicAccount(account: WeixinAccount): PublicWeixinAccount {
  return {
    id: account.id,
    providerAccountId: account.providerAccountId,
    ilinkUserId: account.ilinkUserId,
    baseUrl: account.baseUrl,
    cdnBaseUrl: account.cdnBaseUrl,
    status: account.status,
    enabled: account.enabled,
    lastError: account.lastError,
    lastInboundAt: account.lastInboundAt,
    lastOutboundAt: account.lastOutboundAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

export async function listAccounts(userId: number) {
  const WeixinAccount = await getWeixinAccountModel()
  const accounts = await WeixinAccount.query()
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
  return accounts.map(toPublicAccount)
}

export async function findAccount(userId: number, accountId: string) {
  const WeixinAccount = await getWeixinAccountModel()
  return WeixinAccount.query().where('id', accountId).where('user_id', userId).first()
}

export async function findAccountOrFail(userId: number, accountId: string) {
  const account = await findAccount(userId, accountId)
  if (!account) {
    const error = new Error('Weixin account not found')
    Object.assign(error, { status: 404, code: 'WEIXIN_ACCOUNT_NOT_FOUND' })
    throw error
  }
  return account
}

export function accountMustBeStoppedError() {
  const error = new Error('Weixin account must be stopped before deletion')
  Object.assign(error, {
    status: 409,
    code: 'WEIXIN_ACCOUNT_NOT_STOPPED',
  })
  return error
}

export async function deleteStoppedAccount(userId: number, accountId: string) {
  await db.transaction(async (trx) => {
    const account = await trx
      .from('weixin_accounts')
      .select('id', 'status', 'enabled')
      .where('id', accountId)
      .where('user_id', userId)
      .first()

    if (!account) {
      const error = new Error('Weixin account not found')
      Object.assign(error, { status: 404, code: 'WEIXIN_ACCOUNT_NOT_FOUND' })
      throw error
    }
    if (account.status !== 'stopped' || account.enabled) {
      throw accountMustBeStoppedError()
    }

    await trx.from('weixin_login_sessions').where('account_id', accountId).delete()
    await trx
      .from('weixin_accounts')
      .where('id', accountId)
      .where('user_id', userId)
      .where('status', 'stopped')
      .where('enabled', false)
      .delete()
    const remaining = await trx
      .from('weixin_accounts')
      .where('id', accountId)
      .where('user_id', userId)
      .first()
    if (remaining) throw accountMustBeStoppedError()
  })

  try {
    await removeLocalMediaForAccount(accountId)
  } catch (error) {
    logger.error(
      { err: error, accountId },
      'Failed to remove local media for deleted WeChat account'
    )
  }
}

export function accountToken(account: WeixinAccount) {
  return decryptSecret(account.encryptedBotToken)
}

export async function saveConfirmedAccount(params: {
  userId: number
  providerAccountId: string
  ilinkUserId?: string
  botToken: string
  baseUrl?: string
}) {
  const WeixinAccount = await getWeixinAccountModel()
  const ilinkUserId = params.ilinkUserId?.trim() || null
  let account = await WeixinAccount.query()
    .where('user_id', params.userId)
    .where('provider_account_id', params.providerAccountId)
    .first()

  if (!account && ilinkUserId) {
    account = await WeixinAccount.query()
      .where('user_id', params.userId)
      .where('ilink_user_id', ilinkUserId)
      .orderBy('created_at', 'desc')
      .first()
  }

  const values = {
    providerAccountId: params.providerAccountId,
    ilinkUserId: ilinkUserId ?? account?.ilinkUserId ?? null,
    encryptedBotToken: encryptSecret(params.botToken.trim()),
    baseUrl: params.baseUrl?.trim() || env.get('ILINK_BASE_URL', DEFAULT_ILINK_BASE_URL),
    cdnBaseUrl: env.get('ILINK_CDN_BASE_URL', DEFAULT_CDN_BASE_URL),
    status: 'stopped' as const,
    enabled: true,
    lastError: null,
  }

  if (account) {
    account.merge(values)
    await account.save()
    return account
  }

  account = await WeixinAccount.create({
    id: `wxacc_${randomUUID()}`,
    userId: params.userId,
    ...values,
  })
  return account
}
