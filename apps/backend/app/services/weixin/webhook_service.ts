import crypto from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import WeixinAccount from '#models/weixin_account'
import type WeixinMessage from '#models/weixin_message'
import WeixinWebhookDelivery from '#models/weixin_webhook_delivery'
import WeixinWebhookEndpoint from '#models/weixin_webhook_endpoint'
import { encryptSecret, decryptSecret } from './secret_service.js'
import { sanitizeProtocolPayload } from './payload_sanitizer.js'
import { decodeMessagePayload } from './message_payload_service.js'
import { weixinWebhookEvents, type WeixinWebhookEvent } from '#contracts/weixin'

export const webhookEvents = weixinWebhookEvents
export type { WeixinWebhookEvent }
export const WEBHOOK_MAX_ATTEMPTS = 5

const activeDeliveryIds = new Set<string>()

export type PublicWebhookEndpoint = {
  id: string
  accountId: string
  url: string
  events: WeixinWebhookEvent[]
  enabled: boolean
  lastDeliveryAt: DateTime | null
  createdAt: DateTime
  updatedAt: DateTime
}

function toPublic(endpoint: WeixinWebhookEndpoint): PublicWebhookEndpoint {
  return {
    id: endpoint.id,
    accountId: endpoint.accountId,
    url: endpoint.url,
    events: JSON.parse(endpoint.events) as WeixinWebhookEvent[],
    enabled: Boolean(endpoint.enabled),
    lastDeliveryAt: endpoint.lastDeliveryAt,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  }
}

export async function listWebhooks(userId: number) {
  const accounts = await WeixinAccount.query().where('user_id', userId).select('id')
  if (!accounts.length) return []
  const endpoints = await WeixinWebhookEndpoint.query()
    .whereIn(
      'account_id',
      accounts.map((account) => account.id)
    )
    .orderBy('created_at', 'desc')
  return endpoints.map(toPublic)
}

export async function createWebhook(params: {
  userId: number
  accountId: string
  url: string
  secret: string
  events: WeixinWebhookEvent[]
}) {
  const account = await WeixinAccount.query()
    .where('id', params.accountId)
    .where('user_id', params.userId)
    .first()
  if (!account) {
    const error = new Error('Weixin account not found')
    Object.assign(error, { status: 404, code: 'WEIXIN_ACCOUNT_NOT_FOUND' })
    throw error
  }
  try {
    const url = new URL(params.url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
  } catch {
    const error = new Error('Webhook URL must be a valid URL')
    Object.assign(error, { status: 422, code: 'INVALID_WEBHOOK_URL' })
    throw error
  }

  const endpoint = await WeixinWebhookEndpoint.create({
    id: `wxhook_${randomUUID()}`,
    userId: params.userId,
    accountId: account.id,
    url: params.url,
    encryptedSecret: encryptSecret(params.secret),
    events: JSON.stringify([...new Set(params.events)]),
    enabled: true,
  })
  return toPublic(endpoint)
}

export async function deleteWebhook(userId: number, webhookId: string) {
  const endpoint = await WeixinWebhookEndpoint.query()
    .where('id', webhookId)
    .where('user_id', userId)
    .first()
  if (!endpoint) return false
  await endpoint.delete()
  return true
}

export async function listWebhookDeliveries(userId: number, webhookId: string) {
  const endpoint = await WeixinWebhookEndpoint.query()
    .where('id', webhookId)
    .where('user_id', userId)
    .first()
  if (!endpoint) return null

  const deliveries = await WeixinWebhookDelivery.query()
    .where('endpoint_id', endpoint.id)
    .orderBy('created_at', 'desc')
    .limit(100)
  return deliveries.map((delivery) => ({
    id: delivery.id,
    eventType: delivery.eventType,
    eventId: delivery.eventId,
    status: delivery.status,
    attempts: delivery.attempts,
    lastError: delivery.lastError,
    nextAttemptAt: delivery.nextAttemptAt,
    deliveredAt: delivery.deliveredAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  }))
}

export async function dispatchInboundMessage(account: WeixinAccount, message: WeixinMessage) {
  const endpoints = await WeixinWebhookEndpoint.query()
    .where('account_id', account.id)
    .where('enabled', true)
  if (!endpoints.length) return

  const eventType: WeixinWebhookEvent = 'message.received'
  const event = {
    id: message.id,
    type: eventType,
    createdAt: DateTime.utc().toISO(),
    accountId: account.id,
    message: {
      id: message.id,
      providerMessageId: message.providerMessageId,
      providerSeq: message.providerSeq,
      from: message.fromUserId,
      to: message.toUserId,
      payload: sanitizeProtocolPayload(decodeMessagePayload(message.payload)),
      receivedAt: message.receivedAt,
    },
  }
  const payload = JSON.stringify(event)

  for (const endpoint of endpoints) {
    if (!(JSON.parse(endpoint.events) as string[]).includes(eventType)) continue
    try {
      const delivery = await WeixinWebhookDelivery.create({
        id: `wxdel_${randomUUID()}`,
        endpointId: endpoint.id,
        accountId: account.id,
        eventType,
        eventId: message.id,
        payload,
        status: 'pending',
        attempts: 0,
      })
      void deliverWebhookDelivery(endpoint, delivery).catch(() => undefined)
    } catch {
      // A unique endpoint_id + event_id constraint makes replay idempotent.
    }
  }
}

export async function retryPendingWebhookDeliveries() {
  const deliveries = await WeixinWebhookDelivery.query()
    .where('status', 'pending')
    .orderBy('created_at', 'asc')
    .limit(50)
  const now = DateTime.utc()
  await Promise.all(
    deliveries.map(async (delivery) => {
      if (delivery.nextAttemptAt && delivery.nextAttemptAt > now) return
      const endpoint = await WeixinWebhookEndpoint.find(delivery.endpointId)
      if (!endpoint || !endpoint.enabled) return
      await deliverWebhookDelivery(endpoint, delivery)
    })
  )
}

export function webhookRetryDelayMs(attempt: number) {
  const delays = [5_000, 30_000, 300_000, 1_800_000]
  return delays[Math.max(0, Math.min(attempt - 1, delays.length - 1))]
}

export async function deliverWebhookDelivery(
  endpoint: WeixinWebhookEndpoint,
  delivery: WeixinWebhookDelivery
) {
  if (activeDeliveryIds.has(delivery.id)) return
  activeDeliveryIds.add(delivery.id)
  const attempt = delivery.attempts + 1
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    await delivery.merge({ status: 'pending', attempts: attempt }).save()
    const payload = delivery.payload
    const signature = signWebhookPayload(payload, decryptSecret(endpoint.encryptedSecret))
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'wechat-ilink-api-webhook/0.1.0',
        'X-Weixin-Event': delivery.eventType,
        'X-Weixin-Delivery': delivery.id,
        'X-Weixin-Signature': `sha256=${signature}`,
      },
      body: payload,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`)
    const deliveredAt = DateTime.utc()
    await delivery
      .merge({
        status: 'delivered',
        deliveredAt,
        nextAttemptAt: null,
        lastError: null,
      })
      .save()
    await endpoint.merge({ lastDeliveryAt: deliveredAt }).save()
  } catch (error) {
    const exhausted = attempt >= WEBHOOK_MAX_ATTEMPTS
    await delivery
      .merge({
        status: exhausted ? 'failed' : 'pending',
        nextAttemptAt: exhausted
          ? null
          : DateTime.utc().plus({ milliseconds: webhookRetryDelayMs(attempt) }),
        lastError:
          error instanceof Error ? error.message.slice(0, 1000) : 'Webhook delivery failed',
      })
      .save()
  } finally {
    clearTimeout(timeout)
    activeDeliveryIds.delete(delivery.id)
  }
}

export function signWebhookPayload(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
