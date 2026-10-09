import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.dropTable('chat_conversations')
    this.schema.dropTable('integrations')
    this.schema.dropTable('directory_users')
    this.schema.dropTable('tasks')
  }

  async down() {
    this.schema.createTable('tasks', (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.string('status').notNullable()
      table.string('label').notNullable()
      table.string('priority').notNullable()
      table.string('assignee').nullable()
      table.text('description').nullable()
      table.timestamp('due_date').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('directory_users', (table) => {
      table.string('id').primary()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('username').notNullable().unique()
      table.string('email').notNullable().unique()
      table.string('phone_number').notNullable().defaultTo('')
      table.string('status').notNullable()
      table.string('role').notNullable()
      table.integer('auth_user_id').unsigned().nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('integrations', (table) => {
      table.string('name').primary()
      table.text('description').notNullable()
      table.boolean('connected').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('chat_conversations', (table) => {
      table.string('id').primary()
      table.string('profile').notNullable().defaultTo('')
      table.string('username').notNullable()
      table.string('full_name').notNullable()
      table.string('title').notNullable().defaultTo('')
      table.text('messages').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }
}
