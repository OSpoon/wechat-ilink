import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_webhook_deliveries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 80).primary()
      table
        .string('endpoint_id', 80)
        .notNullable()
        .references('id')
        .inTable('weixin_webhook_endpoints')
        .onDelete('CASCADE')
      table
        .string('account_id', 80)
        .notNullable()
        .references('id')
        .inTable('weixin_accounts')
        .onDelete('CASCADE')
      table.string('event_type', 100).notNullable()
      table.string('event_id', 255).notNullable()
      table.text('payload').notNullable()
      table.string('status', 16).notNullable()
      table.integer('attempts').notNullable().defaultTo(0)
      table.text('last_error').nullable()
      table.timestamp('next_attempt_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['endpoint_id', 'event_id'])
      table.index(['account_id', 'status', 'next_attempt_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
