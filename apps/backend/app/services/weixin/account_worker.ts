import { randomUUID } from 'node:crypto'
import type WeixinAccount from '#models/weixin_account'
import WeixinConversation from '#models/weixin_conversation'
import WeixinMessage from '#models/weixin_message'
import WeixinSyncState from '#models/weixin_sync_state'
import { DateTime } from 'luxon'
import type { ILinkMessage } from '#contracts/weixin'
import { accountToken } from './account_service.js'
import ILinkClient, { ILinkError } from './ilink_client.js'
import { encryptSecret } from './secret_service.js'
import { dispatchInboundMessage } from './webhook_service.js'
import { encodeMessagePayload } from './message_payload_service.js'

const STALE_TOKEN_CODE = -14
const DEFAULT_LONG_POLL_TIMEOUT = 35_000

export class WeixinAccountWorker {
  private readonly abortController = new AbortController()
  private stopped = false

  constructor(private readonly account: WeixinAccount) {}

  stop() {
    this.stopped = true
    this.abortController.abort()
  }

  async run() {
    const token = accountToken(this.account)
    const client = new ILinkClient({ baseUrl: this.account.baseUrl, token })
    let timeoutMs = DEFAULT_LONG_POLL_TIMEOUT
    let consecutiveFailures = 0
    let sync = await WeixinSyncState.find(this.account.id)

    if (!sync) {
      sync = await WeixinSyncState.create({ accountId: this.account.id, getUpdatesBuf: '' })
    }

    await this.account.merge({ status: 'starting', lastError: null }).save()
    try {
      await client.notifyStart()
    } catch {
      // The online notification is best-effort; getupdates remains authoritative.
    }

    await this.account.merge({ status: 'running' }).save()
    try {
      while (!this.stopped) {
        let response
        try {
          response = await client.getUpdates(
            sync.getUpdatesBuf,
            timeoutMs,
            this.abortController.signal
          )
        } catch (error) {
          if (this.stopped || this.abortController.signal.aborted) break
          if (error instanceof ILinkError && error.code === STALE_TOKEN_CODE) {
            await this.account
              .merge({ status: 'reauth_required', lastError: 'iLink token expired' })
              .save()
            break
          }
          if (error instanceof ILinkError && error.message.includes('timeout')) {
            consecutiveFailures = 0
            continue
          }
          consecutiveFailures += 1
          await this.recordError(error instanceof Error ? error.message : 'getupdates failed')
          if (consecutiveFailures >= 3) {
            consecutiveFailures = 0
            await this.sleep(30_000)
          } else {
            await this.sleep(2_000)
          }
          continue
        }

        consecutiveFailures = 0

        if (response.longpolling_timeout_ms && response.longpolling_timeout_ms > 0) {
          timeoutMs = response.longpolling_timeout_ms
        }

        const errorCode = [response.errcode, response.ret].find(
          (value) => value !== undefined && value !== 0
        )
        if (errorCode !== undefined && errorCode !== 0) {
          if (errorCode === STALE_TOKEN_CODE) {
            await this.account
              .merge({ status: 'reauth_required', lastError: 'iLink token expired' })
              .save()
            break
          }
          await this.recordError(response.errmsg ?? `iLink returned code ${errorCode}`)
          await this.sleep(2000)
          continue
        }

        for (const message of response.msgs ?? []) {
          await this.persistInboundMessage(message)
        }

        // Commit the cursor after messages are durable. If the process exits
        // between these operations, replay is safe because inbound messages
        // are deduplicated by account_id + provider_message_id.
        if (response.get_updates_buf !== undefined && response.get_updates_buf !== '') {
          sync.getUpdatesBuf = response.get_updates_buf
          await sync.save()
        }
      }
    } finally {
      try {
        await client.notifyStop()
      } catch {
        // Shutdown notification is best-effort.
      }
      if (this.account.status !== 'reauth_required') {
        await this.account.merge({ status: 'stopped' }).save()
      }
    }
  }

  private async persistInboundMessage(message: ILinkMessage) {
    const providerMessageId = message.message_id !== undefined ? String(message.message_id) : null
    const existing = providerMessageId
      ? await WeixinMessage.query()
          .where('account_id', this.account.id)
          .where('provider_message_id', providerMessageId)
          .first()
      : null
    if (existing) return

    const persistedMessage = await WeixinMessage.create({
      id: `wxmsg_${randomUUID()}`,
      accountId: this.account.id,
      providerMessageId,
      providerSeq: message.seq ?? null,
      clientMessageId: message.client_id ?? null,
      direction: 'inbound',
      fromUserId: message.from_user_id ?? null,
      toUserId: message.to_user_id ?? null,
      payload: encodeMessagePayload(message),
      status: 'received',
      receivedAt: DateTime.utc(),
    })

    const peerUserId = message.from_user_id?.trim()
    if (peerUserId && message.context_token) {
      let conversation = await WeixinConversation.query()
        .where('account_id', this.account.id)
        .where('peer_user_id', peerUserId)
        .first()
      if (!conversation) {
        conversation = new WeixinConversation()
        conversation.id = `wxconv_${randomUUID()}`
        conversation.accountId = this.account.id
        conversation.peerUserId = peerUserId
      }
      conversation.encryptedContextToken = encryptSecret(message.context_token)
      conversation.lastMessageAt = DateTime.utc()
      await conversation.save()
    }

    await this.account.merge({ lastInboundAt: DateTime.utc(), lastError: null }).save()
    void dispatchInboundMessage(this.account, persistedMessage).catch(() => undefined)
  }

  private async recordError(message: string) {
    await this.account.merge({ status: 'error', lastError: message.slice(0, 1000) }).save()
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms)
      this.abortController.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true }
      )
    })
  }
}
