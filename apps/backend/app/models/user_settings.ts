import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UserSettings extends BaseModel {
  static table = 'user_settings'

  @column({ isPrimary: true })
  declare userId: number

  @column()
  declare settings: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
