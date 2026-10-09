import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { WeixinWebhookDeliveryStatus, WeixinWebhookEvent } from '#contracts/weixin'

export default class WeixinWebhookDelivery extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare endpointId: string

  @column()
  declare accountId: string

  @column()
  declare eventType: WeixinWebhookEvent

  @column()
  declare eventId: string

  @column()
  declare payload: string

  @column()
  declare status: WeixinWebhookDeliveryStatus

  @column()
  declare attempts: number

  @column()
  declare lastError: string | null

  @column.dateTime()
  declare nextAttemptAt: DateTime | null

  @column.dateTime()
  declare deliveredAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
