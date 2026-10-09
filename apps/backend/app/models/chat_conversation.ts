import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ChatConversation extends BaseModel {
  static table = 'chat_conversations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare profile: string

  @column()
  declare username: string

  @column()
  declare fullName: string

  @column()
  declare title: string

  @column()
  declare messages: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
