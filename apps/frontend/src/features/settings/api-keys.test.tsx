import { renderWithQueryClient } from '@/test-utils/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import type { ApiKey, CreatedApiKey } from '@/lib/api'
import { SettingsApiKeys } from './api-keys'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiKeysApi: {
    list: mocks.list,
    create: mocks.create,
    revoke: mocks.revoke,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

const listedKey: ApiKey = {
  id: 17,
  name: 'Order sync service',
  abilities: ['api:read', 'api:write'],
  createdAt: '2026-10-01T10:00:00.000Z',
  expiresAt: '2027-10-01T10:00:00.000Z',
  lastUsedAt: null,
}

const createdKey: CreatedApiKey = {
  ...listedKey,
  id: 18,
  name: 'Nightly sync',
  token: 'wilink_test_one_time_secret',
}

describe('SettingsApiKeys', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue([])
    mocks.create.mockResolvedValue(createdKey)
    mocks.revoke.mockResolvedValue(undefined)
  })

  it('creates a scoped key and shows its secret only in the one-time dialog', async () => {
    const screen = await renderWithQueryClient(<SettingsApiKeys />)

    await expect
      .element(screen.getByText('No API keys yet.'))
      .toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Create API key' })
    )
    const dialog = screen.getByRole('dialog')
    await userEvent.fill(
      dialog.getByRole('textbox', { name: 'Name' }),
      'Nightly sync'
    )
    await userEvent.click(dialog.getByRole('combobox', { name: 'Access' }))
    await userEvent.click(
      screen.getByRole('option', { name: 'Read and write' })
    )
    await userEvent.click(dialog.getByRole('combobox', { name: 'Expiration' }))
    await userEvent.click(screen.getByRole('option', { name: '30 days' }))
    await userEvent.click(
      dialog.getByRole('button', { name: 'Create API key' })
    )

    await vi.waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          name: 'Nightly sync',
          access: 'read_write',
          expiresInDays: 30,
        },
        expect.anything()
      )
    )
    await expect
      .element(screen.getByRole('textbox', { name: 'API key' }))
      .toHaveValue(createdKey.token)
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
    await expect
      .element(screen.getByText('No API keys yet.'))
      .toBeInTheDocument()
  })

  it('asks for confirmation before revoking an existing key', async () => {
    mocks.list.mockResolvedValueOnce([listedKey]).mockResolvedValue([])
    const screen = await renderWithQueryClient(<SettingsApiKeys />)

    await expect
      .element(screen.getByText('Order sync service'))
      .toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    const confirmation = screen.getByRole('alertdialog')
    await expect
      .element(
        confirmation.getByText(
          'The integration using this key will lose access immediately.'
        )
      )
      .toBeInTheDocument()
    await userEvent.click(confirmation.getByRole('button', { name: 'Revoke' }))

    await vi.waitFor(() =>
      expect(mocks.revoke).toHaveBeenCalledWith(17, expect.anything())
    )
    await expect
      .element(screen.getByText('No API keys yet.'))
      .toBeInTheDocument()
  })
})
