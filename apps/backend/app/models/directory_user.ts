import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class DirectoryUser extends BaseModel {
  static table = 'directory_users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare authUserId: number | null

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare username: string

  @column()
  declare email: string

  @column()
  declare phoneNumber: string

  @column()
  declare status: string

  @column()
  declare role: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
