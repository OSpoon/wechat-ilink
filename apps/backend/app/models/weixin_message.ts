import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { WeixinMessageDirection, WeixinMessageStatus } from '#contracts/weixin'

export default class WeixinMessage extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare accountId: string

  @column()
  declare providerMessageId: string | null

  @column()
  declare providerSeq: number | null

  @column()
  declare clientMessageId: string | null

  @column()
  declare direction: WeixinMessageDirection

  @column()
  declare fromUserId: string | null

  @column()
  declare toUserId: string | null

  @column()
  declare payload: string

  @column()
  declare status: WeixinMessageStatus

  @column()
  declare errorCode: string | null

  @column.dateTime()
  declare receivedAt: DateTime | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
