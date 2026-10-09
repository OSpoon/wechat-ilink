import { faker } from '@faker-js/faker'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import ChatConversation from '#models/chat_conversation'
import DirectoryUser from '#models/directory_user'
import DemoTask from '#models/demo_task'
import Integration from '#models/integration'

const integrationFixtures = [
  {
    name: 'Telegram',
    description: 'Connect with Telegram for real-time communication.',
    connected: false,
  },
  {
    name: 'Notion',
    description: 'Effortlessly sync Notion pages for seamless collaboration.',
    connected: true,
  },
  {
    name: 'Figma',
    description: 'View and collaborate on Figma designs in one place.',
    connected: true,
  },
  {
    name: 'Trello',
    description: 'Sync Trello cards for streamlined project management.',
    connected: false,
  },
  {
    name: 'Slack',
    description: 'Integrate Slack for efficient team communication',
    connected: false,
  },
  { name: 'Zoom', description: 'Host Zoom meetings directly from the dashboard.', connected: true },
  {
    name: 'Stripe',
    description: 'Easily manage Stripe transactions and payments.',
    connected: false,
  },
  { name: 'Gmail', description: 'Access and manage Gmail messages effortlessly.', connected: true },
  {
    name: 'Medium',
    description: 'Explore and share Medium stories on your dashboard.',
    connected: false,
  },
  { name: 'Skype', description: 'Connect with Skype contacts seamlessly.', connected: false },
  {
    name: 'Docker',
    description: 'Effortlessly manage Docker containers on your dashboard.',
    connected: false,
  },
  {
    name: 'GitHub',
    description: 'Streamline code management with GitHub integration.',
    connected: false,
  },
  {
    name: 'GitLab',
    description: 'Efficiently manage code projects with GitLab integration.',
    connected: false,
  },
  {
    name: 'Discord',
    description: 'Connect with Discord for seamless team communication.',
    connected: false,
  },
  {
    name: 'WhatsApp',
    description: 'Easily integrate WhatsApp for direct messaging.',
    connected: false,
  },
]

export default class MainSeeder extends BaseSeeder {
  async run() {
    const taskCount = await DemoTask.query().count('* as total')
    if (Number(taskCount[0].$extras.total) === 0) {
      faker.seed(12345)
      const statuses = ['todo', 'in progress', 'done', 'canceled', 'backlog'] as const
      const labels = ['bug', 'feature', 'documentation'] as const
      const priorities = ['low', 'medium', 'high'] as const
      const ids = new Set<string>()
      const tasks = Array.from({ length: 100 }, () => {
        let id = `TASK-${faker.number.int({ min: 1000, max: 9999 })}`
        while (ids.has(id)) id = `TASK-${faker.number.int({ min: 1000, max: 9999 })}`
        ids.add(id)
        return {
          id,
          title: faker.lorem.sentence({ min: 5, max: 15 }),
          status: faker.helpers.arrayElement(statuses),
          label: faker.helpers.arrayElement(labels),
          priority: faker.helpers.arrayElement(priorities),
          createdAt: DateTime.fromJSDate(faker.date.past()),
          updatedAt: DateTime.fromJSDate(faker.date.recent()),
          assignee: faker.person.fullName(),
          description: faker.lorem.paragraph({ min: 1, max: 3 }),
          dueDate: DateTime.fromJSDate(faker.date.future()),
        }
      })
      await DemoTask.createMany(tasks)
    }

    const directoryUserCount = await DirectoryUser.query().count('* as total')
    if (Number(directoryUserCount[0].$extras.total) === 0) {
      faker.seed(67890)
      const statuses = ['active', 'inactive', 'invited', 'suspended'] as const
      const roles = ['superadmin', 'admin', 'cashier', 'manager'] as const
      const users = Array.from({ length: 500 }, () => {
        const firstName = faker.person.firstName()
        const lastName = faker.person.lastName()
        return {
          id: faker.string.uuid(),
          firstName,
          lastName,
          username: faker.internet.username({ firstName, lastName }).toLowerCase(),
          email: faker.internet.email({ firstName }).toLowerCase(),
          phoneNumber: faker.phone.number({ style: 'international' }),
          status: faker.helpers.arrayElement(statuses),
          role: faker.helpers.arrayElement(roles),
          createdAt: DateTime.fromJSDate(faker.date.past()),
          updatedAt: DateTime.fromJSDate(faker.date.recent()),
        }
      })
      await DirectoryUser.createMany(users)
    }

    const integrationCount = await Integration.query().count('* as total')
    if (Number(integrationCount[0].$extras.total) === 0) {
      const now = DateTime.now()
      await Integration.createMany(
        integrationFixtures.map((integration) => ({
          ...integration,
          createdAt: now,
          updatedAt: now,
        }))
      )
    }

    const conversationCount = await ChatConversation.query().count('* as total')
    if (Number(conversationCount[0].$extras.total) === 0) {
      const fileUrl = new URL('../fixtures/chat_demo_data.json', import.meta.url)
      const fixture = JSON.parse(await readFile(fileUrl, 'utf8')) as {
        conversations: Array<{
          id: string
          profile: string
          username: string
          fullName: string
          title: string
          messages: Array<{ sender: string; message: string; timestamp: string }>
        }>
      }
      const now = DateTime.now()
      await ChatConversation.createMany(
        fixture.conversations.map((conversation) => ({
          ...conversation,
          messages: JSON.stringify(conversation.messages),
          createdAt: now,
          updatedAt: now,
        }))
      )
    }
  }
}
