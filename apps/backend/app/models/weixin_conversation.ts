import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class WeixinConversation extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare accountId: string

  @column()
  declare peerUserId: string

  @column()
  declare encryptedContextToken: string | null

  @column()
  declare encryptedTypingTicket: string | null

  @column.dateTime()
  declare typingTicketExpiresAt: DateTime | null

  @column.dateTime()
  declare lastMessageAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
