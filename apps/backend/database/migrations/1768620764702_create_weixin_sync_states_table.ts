import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_sync_states'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .string('account_id', 80)
        .primary()
        .references('id')
        .inTable('weixin_accounts')
        .onDelete('CASCADE')
      table.text('get_updates_buf').notNullable().defaultTo('')
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
