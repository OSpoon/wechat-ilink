import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { WeixinAccountStatus } from '#contracts/weixin'

export default class WeixinAccount extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare providerAccountId: string

  @column()
  declare ilinkUserId: string | null

  @column()
  declare encryptedBotToken: string

  @column()
  declare baseUrl: string

  @column()
  declare cdnBaseUrl: string

  @column()
  declare status: WeixinAccountStatus

  @column()
  declare enabled: boolean

  @column()
  declare lastError: string | null

  @column.dateTime()
  declare lastInboundAt: DateTime | null

  @column.dateTime()
  declare lastOutboundAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
