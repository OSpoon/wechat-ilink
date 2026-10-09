import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class WeixinWebhookEndpoint extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare accountId: string

  @column()
  declare url: string

  @column()
  declare encryptedSecret: string

  @column()
  declare events: string

  @column()
  declare enabled: boolean

  @column.dateTime()
  declare lastDeliveryAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
