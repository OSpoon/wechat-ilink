import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 80).primary()
      table
        .string('account_id', 80)
        .notNullable()
        .references('id')
        .inTable('weixin_accounts')
        .onDelete('CASCADE')
      table.string('peer_user_id', 255).notNullable()
      table.text('encrypted_context_token').nullable()
      table.text('encrypted_typing_ticket').nullable()
      table.timestamp('last_message_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['account_id', 'peer_user_id'])
      table.index(['account_id', 'last_message_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
