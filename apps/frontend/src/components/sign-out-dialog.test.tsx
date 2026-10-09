import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset: vi.fn(),
  logout: vi.fn().mockResolvedValue({ message: 'Logged out' }),
  href: 'https://app.test/dashboard?tab=1',
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { reset: mocks.reset },
  }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { logout: mocks.logout },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLocation: () => ({ href: mocks.href }),
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls auth.reset and navigates to sign-in with current location as redirect', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(mocks.reset).toHaveBeenCalledOnce())
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: mocks.href },
      replace: true,
    })
  })

  it('does not call reset or navigate when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(mocks.reset).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
