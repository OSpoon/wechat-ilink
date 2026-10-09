import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ClerkAuthLink } from './clerk-auth-link'

const mocks = vi.hoisted(() => ({ reset: vi.fn() }))

vi.mock('@/lib/runtime-config', () => ({
  CLERK_PUBLISHABLE_KEY: 'pk_test_demo',
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ auth: { reset: mocks.reset } }),
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  const { createElement } = await import('react')

  return {
    ...actual,
    Link: ({
      children,
      onClick,
      to,
    }: {
      children: React.ReactNode
      onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
      to: string
    }) =>
      createElement(
        'a',
        {
          href: to,
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault()
            onClick?.(event)
          },
        },
        children
      ),
  }
})

describe('ClerkAuthLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers Clerk sign-in and clears the previous provider session', async () => {
    const { getByRole } = await render(<ClerkAuthLink mode='sign-in' />)

    await userEvent.click(getByRole('link', { name: 'Continue with Clerk' }))

    expect(mocks.reset).toHaveBeenCalledOnce()
  })
})
