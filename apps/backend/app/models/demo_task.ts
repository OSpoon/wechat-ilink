import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class DemoTask extends BaseModel {
  static table = 'tasks'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare status: string

  @column()
  declare label: string

  @column()
  declare priority: string

  @column()
  declare assignee: string | null

  @column()
  declare description: string | null

  @column.dateTime()
  declare dueDate: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
