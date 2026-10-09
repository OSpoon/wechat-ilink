import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('directory_users', (table) => {
      table.integer('auth_user_id').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('directory_users', (table) => {
      table.dropColumn('auth_user_id')
    })
  }
}
