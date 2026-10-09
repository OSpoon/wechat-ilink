import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('clerk_user_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('clerk_user_id').nullable().unique()
    })
  }
}
