import { randomUUID } from 'node:crypto'
import ChatConversation from '#models/chat_conversation'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const newConversationValidator = vine.create({
  participants: vine.array(
    vine.object({
      id: vine.string(),
      profile: vine.string().optional(),
      username: vine.string().trim().minLength(1),
      fullName: vine.string().trim().minLength(1),
      title: vine.string().optional(),
    })
  ),
})
const messageValidator = vine.create({ message: vine.string().trim().minLength(1).maxLength(5000) })

type ChatMessage = { sender: string; message: string; timestamp: string }

function serializeConversation(conversation: ChatConversation) {
  return {
    id: conversation.id,
    profile: conversation.profile,
    username: conversation.username,
    fullName: conversation.fullName,
    title: conversation.title,
    messages: JSON.parse(conversation.messages) as ChatMessage[],
  }
}

export default class ChatsController {
  async index() {
    const conversations = await ChatConversation.query().orderBy('rowid', 'asc')
    return { data: conversations.map(serializeConversation) }
  }

  async store({ request, response }: HttpContext) {
    const { participants } = await request.validateUsing(newConversationValidator)
    if (!participants.length) return response.badRequest({ message: 'Choose at least one person' })

    const first = participants[0]!
    const isGroup = participants.length > 1
    const conversation = await ChatConversation.create({
      id: randomUUID(),
      profile: first.profile ?? '',
      username: participants.map(({ username }) => username).join(', '),
      fullName: participants.map(({ fullName }) => fullName).join(', '),
      title: isGroup ? 'Group conversation' : (first.title ?? ''),
      messages: '[]',
    })
    return response.created({ data: serializeConversation(conversation) })
  }

  async storeMessage({ request, params, response }: HttpContext) {
    const conversation = await ChatConversation.find(params.id)
    if (!conversation) return response.notFound({ message: 'Conversation not found' })

    const { message } = await request.validateUsing(messageValidator)
    const messages = JSON.parse(conversation.messages) as ChatMessage[]
    messages.unshift({ sender: 'You', message, timestamp: new Date().toISOString() })
    conversation.messages = JSON.stringify(messages)
    await conversation.save()
    return { data: serializeConversation(conversation) }
  }
}
