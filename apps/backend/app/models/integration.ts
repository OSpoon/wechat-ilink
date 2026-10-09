import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class Integration extends BaseModel {
  static table = 'integrations'

  @column({ isPrimary: true })
  declare name: string

  @column()
  declare description: string

  @column()
  declare connected: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
