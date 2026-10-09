import type User from '#models/user'
import UserSettings from '#models/user_settings'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const settingsValidators = {
  account: vine.create({
    name: vine.string().trim().minLength(2).maxLength(30),
  }),
  appearance: vine.create({
    theme: vine.enum(['light', 'dark', 'system'] as const).optional(),
    font: vine.string().trim().minLength(1).maxLength(100).optional(),
  }),
}

type ThemePreference = 'light' | 'dark' | 'system'

type Settings = {
  account: { name: string }
  appearance: { theme: ThemePreference; font: string }
}

function normalizeSettings(user: User, value: unknown): Settings {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const appearance =
    stored.appearance && typeof stored.appearance === 'object'
      ? (stored.appearance as Record<string, unknown>)
      : {}

  return {
    account: { name: user.fullName || '' },
    appearance: {
      theme:
        appearance.theme === 'light' || appearance.theme === 'dark' || appearance.theme === 'system'
          ? appearance.theme
          : 'system',
      font: typeof appearance.font === 'string' ? appearance.font : 'inter',
    },
  }
}

async function getOrCreateSettings(user: User) {
  let row = await UserSettings.find(user.id)
  if (!row) {
    row = await UserSettings.create({
      userId: user.id,
      settings: JSON.stringify(normalizeSettings(user, null)),
    })
  }
  return row
}

export default class SettingsController {
  async show({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const row = await getOrCreateSettings(user)
    const settings = normalizeSettings(user, JSON.parse(row.settings) as unknown)
    const serialized = JSON.stringify(settings)
    if (row.settings !== serialized) {
      row.settings = serialized
      await row.save()
    }
    return { data: settings }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const section = params.section
    let sectionData: Record<string, unknown>

    switch (section) {
      case 'account':
        sectionData = await request.validateUsing(settingsValidators.account)
        break
      case 'appearance':
        sectionData = Object.fromEntries(
          Object.entries(await request.validateUsing(settingsValidators.appearance)).filter(
            ([, value]) => value !== undefined
          )
        )
        if (!Object.keys(sectionData).length) {
          return response.badRequest({ message: 'At least one setting is required' })
        }
        break
      default:
        return response.notFound({ message: 'Settings section not found' })
    }

    const row = await getOrCreateSettings(user)
    const settings = normalizeSettings(user, JSON.parse(row.settings) as unknown)
    if (section === 'account') {
      settings.account = sectionData as Settings['account']
      await user.merge({ fullName: settings.account.name }).save()
    } else {
      settings.appearance = {
        ...settings.appearance,
        ...sectionData,
      } as Settings['appearance']
    }
    row.settings = JSON.stringify(settings)
    await row.save()

    return { data: settings }
  }
}
