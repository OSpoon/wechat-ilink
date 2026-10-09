import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weixin_webhook_endpoints'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 80).primary()
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .string('account_id', 80)
        .notNullable()
        .references('id')
        .inTable('weixin_accounts')
        .onDelete('CASCADE')
      table.string('url', 2048).notNullable()
      table.text('encrypted_secret').notNullable()
      table.text('events').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('last_delivery_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['account_id', 'url'])
      table.index(['user_id', 'account_id', 'enabled'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
