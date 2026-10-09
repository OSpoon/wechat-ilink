import type User from '#models/user'
import UserSettings from '#models/user_settings'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const settingsValidators = {
  account: vine.create({
    name: vine.string().trim().minLength(2).maxLength(30),
    dob: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    language: vine.enum(['en', 'fr', 'de', 'es', 'pt', 'ru', 'ja', 'ko', 'zh'] as const),
  }),
  profile: vine.create({
    username: vine.string().trim().minLength(2).maxLength(30),
    email: vine.string().trim().email(),
    bio: vine.string().trim().minLength(4).maxLength(160),
    urls: vine.array(vine.object({ value: vine.string().url() })).optional(),
  }),
  appearance: vine.create({
    theme: vine.enum(['light', 'dark'] as const),
    font: vine.string().trim().minLength(1).maxLength(100),
  }),
  display: vine.create({
    items: vine
      .array(
        vine.enum(['recents', 'home', 'applications', 'desktop', 'downloads', 'documents'] as const)
      )
      .minLength(1),
  }),
  notifications: vine.create({
    type: vine.enum(['all', 'mentions', 'none'] as const),
    mobile: vine.boolean().optional(),
    communication_emails: vine.boolean().optional(),
    social_emails: vine.boolean().optional(),
    marketing_emails: vine.boolean().optional(),
    security_emails: vine.boolean(),
  }),
}

type Settings = Record<string, Record<string, unknown>>

function defaults(user: User): Settings {
  const displayName = user.fullName || 'Admin User'
  return {
    account: { name: displayName, dob: '1990-01-01', language: 'en' },
    profile: {
      username: 'shadcn',
      email: 'm@example.com',
      bio: 'I own a computer.',
      urls: [{ value: 'https://shadcn.com' }, { value: 'http://twitter.com/shadcn' }],
    },
    appearance: { theme: 'light', font: 'inter' },
    display: { items: ['recents', 'home'] },
    notifications: {
      type: 'all',
      mobile: false,
      communication_emails: false,
      social_emails: true,
      marketing_emails: false,
      security_emails: true,
    },
  }
}

async function getOrCreateSettings(user: User) {
  let row = await UserSettings.find(user.id)
  if (!row) {
    row = await UserSettings.create({
      userId: user.id,
      settings: JSON.stringify(defaults(user)),
    })
  }
  return row
}

export default class SettingsController {
  async show({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const row = await getOrCreateSettings(user)
    return { data: JSON.parse(row.settings) as Settings }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const section = params.section
    let sectionData: Record<string, unknown>

    switch (section) {
      case 'account':
        sectionData = await request.validateUsing(settingsValidators.account)
        break
      case 'profile':
        sectionData = await request.validateUsing(settingsValidators.profile)
        break
      case 'appearance':
        sectionData = await request.validateUsing(settingsValidators.appearance)
        break
      case 'display':
        sectionData = await request.validateUsing(settingsValidators.display)
        break
      case 'notifications':
        sectionData = await request.validateUsing(settingsValidators.notifications)
        break
      default:
        return response.notFound({ message: 'Settings section not found' })
    }
    const row = await getOrCreateSettings(user)
    const settings = JSON.parse(row.settings) as Settings
    settings[section] = sectionData
    row.settings = JSON.stringify(settings)
    await row.save()

    if (section === 'account') {
      await user.merge({ fullName: (sectionData as { name: string }).name }).save()
    }

    return { data: settings }
  }
}
