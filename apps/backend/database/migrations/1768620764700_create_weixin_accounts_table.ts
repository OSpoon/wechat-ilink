import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_accounts'

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
      table.string('provider_account_id', 255).notNullable()
      table.string('ilink_user_id', 255).nullable()
      table.text('encrypted_bot_token').notNullable()
      table.string('base_url', 500).notNullable()
      table.string('cdn_base_url', 500).notNullable()
      table.string('status', 32).notNullable().defaultTo('stopped')
      table.boolean('enabled').notNullable().defaultTo(false)
      table.text('last_error').nullable()
      table.timestamp('last_inbound_at').nullable()
      table.timestamp('last_outbound_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['user_id', 'provider_account_id'])
      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
