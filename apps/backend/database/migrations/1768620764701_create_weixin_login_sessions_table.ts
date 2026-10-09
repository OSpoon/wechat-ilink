import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_login_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 80).primary()
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('qrcode', 500).notNullable()
      table.text('qrcode_url').notNullable()
      table.string('status', 32).notNullable().defaultTo('waiting_scan')
      table.string('bot_type', 16).notNullable().defaultTo('3')
      table.string('polling_base_url', 500).notNullable()
      table.string('account_id', 80).nullable()
      table.string('ilink_user_id', 255).nullable()
      table.text('error_message').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
