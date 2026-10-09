import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class WeixinSyncState extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare accountId: string

  @column()
  declare getUpdatesBuf: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
