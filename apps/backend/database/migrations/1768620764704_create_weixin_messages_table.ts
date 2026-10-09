import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 80).primary()
      table
        .string('account_id', 80)
        .notNullable()
        .references('id')
        .inTable('weixin_accounts')
        .onDelete('CASCADE')
      table.string('provider_message_id', 255).nullable()
      table.integer('provider_seq').nullable()
      table.string('client_message_id', 255).nullable()
      table.string('direction', 16).notNullable()
      table.string('from_user_id', 255).nullable()
      table.string('to_user_id', 255).nullable()
      table.text('payload').notNullable()
      table.string('status', 16).notNullable()
      table.string('error_code', 64).nullable()
      table.timestamp('received_at').nullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['account_id', 'provider_message_id'])
      table.index(['account_id', 'direction', 'created_at'])
      table.index(['account_id', 'from_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
