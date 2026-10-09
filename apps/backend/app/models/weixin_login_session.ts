import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { WeixinLoginSessionStatus } from '#contracts/weixin'

export default class WeixinLoginSession extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare qrcode: string

  @column()
  declare qrcodeUrl: string

  @column()
  declare status: WeixinLoginSessionStatus

  @column()
  declare botType: string

  @column()
  declare pollingBaseUrl: string

  @column()
  declare accountId: string | null

  @column()
  declare ilinkUserId: string | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
