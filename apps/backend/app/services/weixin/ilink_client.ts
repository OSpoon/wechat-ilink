import crypto from 'node:crypto'
import env from '#start/env'
import type {
  ILinkConfigResponse,
  ILinkQrCodeResponse,
  ILinkQrStatusResponse,
  ILinkSendMessage,
  ILinkUploadUrlResponse,
  ILinkUpdatesResponse,
} from '../../contracts/weixin.js'
// Keep protocol contracts independent from Lucid models and HTTP controllers.

export const DEFAULT_ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com'
export const DEFAULT_CDN_BASE_URL = 'https://novac2c.cdn.weixin.qq.com/c2c'

export class ILinkError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly upstreamStatus?: number
  ) {
    super(message)
    this.name = 'ILinkError'
  }
}

function randomWechatUin() {
  const value = crypto.randomBytes(4).readUInt32BE(0)
  return Buffer.from(String(value), 'utf8').toString('base64')
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function appHeaders() {
  return {
    'iLink-App-Id': env.get('ILINK_APP_ID'),
    'iLink-App-ClientVersion': env.get('ILINK_APP_CLIENT_VERSION'),
  }
}

const DEFAULT_BOT_AGENT = 'OpenClaw'

/** Keep bot_agent compatible with openclaw-weixin's UA-style wire format. */
export function sanitizeBotAgent(raw: string | undefined) {
  if (!raw?.trim()) return DEFAULT_BOT_AGENT

  const productRe = /^[A-Za-z0-9_.-]{1,32}\/[A-Za-z0-9_.+-]{1,32}$/
  const commentCharRe = /^[\x20-\x27\x2A-\x7E]{1,64}$/
  const rawTokens = raw.trim().split(/\s+/)
  const tokens: string[] = []
  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index]
    if (token.startsWith('(') && !token.endsWith(')')) {
      let combined = token
      while (index + 1 < rawTokens.length && !combined.endsWith(')')) {
        index += 1
        combined += ` ${rawTokens[index]}`
      }
      tokens.push(combined)
    } else {
      tokens.push(token)
    }
  }

  const accepted: string[] = []
  let pendingProduct: string | null = null

  for (const token of tokens) {
    if (token.startsWith('(') && token.endsWith(')')) {
      const comment = token.slice(1, -1)
      if (pendingProduct && commentCharRe.test(comment)) {
        accepted.push(`${pendingProduct} (${comment})`)
        pendingProduct = null
      } else if (pendingProduct) {
        accepted.push(pendingProduct)
        pendingProduct = null
      }
      continue
    }
    if (pendingProduct) accepted.push(pendingProduct)
    pendingProduct = productRe.test(token) ? token : null
  }
  if (pendingProduct) accepted.push(pendingProduct)

  const result = accepted.join(' ')
  if (!result) return DEFAULT_BOT_AGENT
  if (Buffer.byteLength(result, 'utf8') <= 256) return result

  const truncated: string[] = []
  let length = 0
  for (const token of accepted) {
    const additionalLength = (truncated.length === 0 ? 0 : 1) + Buffer.byteLength(token, 'utf8')
    if (length + additionalLength > 256) break
    truncated.push(token)
    length += additionalLength
  }
  return truncated.length > 0 ? truncated.join(' ') : DEFAULT_BOT_AGENT
}

export default class ILinkClient {
  constructor(
    private readonly options: {
      baseUrl: string
      token?: string
      timeoutMs?: number
    }
  ) {}

  private async request<T>(params: {
    method: 'GET' | 'POST'
    endpoint: string
    body?: unknown
    protocolHeaders?: boolean
    withBotToken?: boolean
    onAbort?: () => T
    timeoutMs?: number
    abortSignal?: AbortSignal
  }): Promise<T> {
    const url = new URL(params.endpoint, normalizeBaseUrl(this.options.baseUrl))
    const token = this.options.token?.trim()
    const headers: Record<string, string> = {
      ...appHeaders(),
      ...(params.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      ...((params.protocolHeaders ?? params.method === 'POST')
        ? {
            'AuthorizationType': 'ilink_bot_token',
            'X-WECHAT-UIN': randomWechatUin(),
          }
        : {}),
      ...(params.withBotToken !== false && token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      params.timeoutMs ?? this.options.timeoutMs ?? 15_000
    )

    try {
      const response = await fetch(url, {
        method: params.method,
        headers,
        ...(params.body !== undefined ? { body: JSON.stringify(params.body) } : {}),
        signal: params.abortSignal
          ? AbortSignal.any([controller.signal, params.abortSignal])
          : controller.signal,
      })
      const raw = await response.text()
      let payload: T | { ret?: number; errcode?: number; errmsg?: string }
      try {
        payload = raw ? (JSON.parse(raw) as T) : ({} as T)
      } catch {
        throw new ILinkError(
          `invalid JSON response from ${params.endpoint}`,
          undefined,
          response.status
        )
      }

      if (!response.ok) {
        throw new ILinkError(
          `iLink ${params.endpoint} returned HTTP ${response.status}`,
          undefined,
          response.status
        )
      }

      const result = payload as { ret?: number; errcode?: number; errmsg?: string }
      const code = [result.errcode, result.ret].find((value) => value !== undefined && value !== 0)
      if (code !== undefined && code !== 0) {
        throw new ILinkError(result.errmsg ?? `iLink returned code ${code}`, code)
      }

      return payload as T
    } catch (error) {
      if (error instanceof ILinkError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        if (params.onAbort) return params.onAbort()
        throw new ILinkError(`iLink request timeout: ${params.endpoint}`)
      }
      throw new ILinkError(`iLink request failed: ${params.endpoint}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  getBotQrCode(botType: string, localTokenList: string[] = []) {
    return this.request<ILinkQrCodeResponse>({
      method: 'POST',
      endpoint: `ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`,
      body: { local_token_list: localTokenList },
      withBotToken: false,
      timeoutMs: 15_000,
    })
  }

  getQrCodeStatus(qrcode: string, verifyCode?: string) {
    const query = new URLSearchParams({ qrcode })
    if (verifyCode) query.set('verify_code', verifyCode)
    return this.request<ILinkQrStatusResponse>({
      method: 'GET',
      endpoint: `ilink/bot/get_qrcode_status?${query.toString()}`,
      protocolHeaders: false,
      withBotToken: false,
      timeoutMs: 35_000,
    })
  }

  getUpdates(getUpdatesBuf: string, timeoutMs: number, abortSignal?: AbortSignal) {
    return this.request<ILinkUpdatesResponse>({
      method: 'POST',
      endpoint: 'ilink/bot/getupdates',
      body: {
        get_updates_buf: getUpdatesBuf,
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs,
      abortSignal,
      onAbort: () => ({ ret: 0, msgs: [], get_updates_buf: getUpdatesBuf }),
    })
  }

  sendMessage(message: Omit<ILinkSendMessage, 'client_id'> & { client_id?: string }) {
    const resolvedClientId = message.client_id ?? crypto.randomUUID()
    const resolvedMessage = { ...message, client_id: resolvedClientId }
    return this.request<{ ret?: number; errmsg?: string }>({
      method: 'POST',
      endpoint: 'ilink/bot/sendmessage',
      body: {
        msg: resolvedMessage,
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 15_000,
    }).then((response) => ({ ...response, clientId: resolvedClientId }))
  }

  sendText(
    toUserId: string,
    text: string,
    contextToken?: string,
    clientId?: string,
    runId?: string
  ) {
    const resolvedClientId = clientId ?? crypto.randomUUID()
    return this.sendMessage({
      from_user_id: '',
      to_user_id: toUserId,
      client_id: resolvedClientId,
      message_type: 2,
      message_state: 2,
      ...(text ? { item_list: [{ type: 1, text_item: { text } }] } : {}),
      ...(contextToken ? { context_token: contextToken } : {}),
      ...(runId ? { run_id: runId } : {}),
    })
  }

  getUploadUrl(params: {
    filekey: string
    mediaType: number
    toUserId: string
    rawSize: number
    rawFileMd5: string
    fileSize: number
    aesKey: string
  }) {
    return this.request<ILinkUploadUrlResponse>({
      method: 'POST',
      endpoint: 'ilink/bot/getuploadurl',
      body: {
        filekey: params.filekey,
        media_type: params.mediaType,
        to_user_id: params.toUserId,
        rawsize: params.rawSize,
        rawfilemd5: params.rawFileMd5,
        filesize: params.fileSize,
        no_need_thumb: true,
        aeskey: params.aesKey,
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 15_000,
    })
  }

  getConfig(ilinkUserId: string, contextToken?: string) {
    return this.request<ILinkConfigResponse>({
      method: 'POST',
      endpoint: 'ilink/bot/getconfig',
      body: {
        ilink_user_id: ilinkUserId,
        ...(contextToken ? { context_token: contextToken } : {}),
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 10_000,
    })
  }

  sendTyping(ilinkUserId: string, typingTicket: string, status: 1 | 2) {
    return this.request<{ ret?: number; errmsg?: string }>({
      method: 'POST',
      endpoint: 'ilink/bot/sendtyping',
      body: {
        ilink_user_id: ilinkUserId,
        typing_ticket: typingTicket,
        status,
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 10_000,
    })
  }

  notifyStart() {
    return this.request({
      method: 'POST',
      endpoint: 'ilink/bot/msg/notifystart',
      body: {
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 10_000,
    })
  }

  notifyStop() {
    return this.request({
      method: 'POST',
      endpoint: 'ilink/bot/msg/notifystop',
      body: {
        base_info: {
          channel_version: env.get('ILINK_CHANNEL_VERSION'),
          bot_agent: sanitizeBotAgent(env.get('ILINK_BOT_AGENT')),
        },
      },
      timeoutMs: 10_000,
    })
  }
}
