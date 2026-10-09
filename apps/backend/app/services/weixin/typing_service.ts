import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import WeixinConversation from '#models/weixin_conversation'
import type WeixinAccount from '#models/weixin_account'
import { decryptSecret, encryptSecret } from './secret_service.js'
import ILinkClient from './ilink_client.js'
import { accountToken } from './account_service.js'
import type { WeixinTypingStatus } from '#contracts/weixin'

const TYPING_TICKET_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function sendTypingStatus(params: {
  account: WeixinAccount
  toUserId: string
  status: WeixinTypingStatus
  contextToken?: string
}) {
  if (!params.account.ilinkUserId) throw new Error('Weixin account has no ilink user id')

  let conversation = await WeixinConversation.query()
    .where('account_id', params.account.id)
    .where('peer_user_id', params.toUserId)
    .first()
  const client = new ILinkClient({
    baseUrl: params.account.baseUrl,
    token: accountToken(params.account),
  })

  const cachedTypingTicket = conversation?.encryptedTypingTicket
    ? decryptSecret(conversation.encryptedTypingTicket)
    : null
  let typingTicket =
    cachedTypingTicket && conversation?.typingTicketExpiresAt
      ? conversation.typingTicketExpiresAt > DateTime.utc()
        ? cachedTypingTicket
        : null
      : null

  if (!typingTicket) {
    try {
      const config = await client.getConfig(params.toUserId, params.contextToken)
      typingTicket = config.typing_ticket?.trim() || null
      if (!typingTicket) throw new Error('iLink did not return a typing ticket')
      if (!conversation) {
        conversation = new WeixinConversation()
        conversation.id = `wxconv_${randomUUID()}`
        conversation.accountId = params.account.id
        conversation.peerUserId = params.toUserId
      }
      conversation.encryptedTypingTicket = encryptSecret(typingTicket)
      conversation.typingTicketExpiresAt = DateTime.utc().plus({
        milliseconds: Math.random() * TYPING_TICKET_CACHE_TTL_MS,
      })
      await conversation.save()
    } catch (error) {
      // Match openclaw-weixin's config cache: a refresh failure does not
      // discard a previously usable ticket.
      if (!cachedTypingTicket) throw error
      typingTicket = cachedTypingTicket
    }
  }

  await client.sendTyping(params.toUserId, typingTicket, params.status)
  return { to: params.toUserId, status: params.status }
}
