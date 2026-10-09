export interface ApiUser {
  id: number
  fullName: string | null
  email: string
  createdAt: string | null
  updatedAt: string | null
  initials: string
}

export type WeixinAccountStatus =
  'stopped' | 'starting' | 'running' | 'reauth_required' | 'error'

export type WeixinLoginStatus =
  | 'waiting_scan'
  | 'scanned'
  | 'need_verifycode'
  | 'verifying'
  | 'confirmed'
  | 'already_connected'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type WeixinAccount = {
  id: string
  providerAccountId: string
  ilinkUserId: string | null
  baseUrl: string
  cdnBaseUrl: string
  status: WeixinAccountStatus
  enabled: boolean
  lastError: string | null
  lastInboundAt: string | null
  lastOutboundAt: string | null
  createdAt: string
  updatedAt: string
}

export type WeixinLoginSession = {
  id: string
  status: WeixinLoginStatus
  qrUrl?: string
  accountId: string | null
  ilinkUserId: string | null
  errorMessage: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type WeixinMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  from: string | null
  to: string | null
  status: 'received' | 'sent' | 'failed'
  providerMessageId: string | null
  clientMessageId: string | null
  payload: Record<string, unknown>
  media: { itemIndex: number; url: string }[]
  receivedAt: string | null
  sentAt: string | null
  createdAt: string
}

export type WeixinWebhook = {
  id: string
  accountId: string
  url: string
  events: string[]
  enabled: boolean
  lastDeliveryAt: string | null
  createdAt: string
  updatedAt: string
}

export type WeixinWebhookDelivery = {
  id: string
  eventType: string
  eventId: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  lastError: string | null
  nextAttemptAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
}
