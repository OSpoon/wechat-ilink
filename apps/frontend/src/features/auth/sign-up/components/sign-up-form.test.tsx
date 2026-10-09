import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { authApi } from '@/lib/api'
import { SignUpForm } from './sign-up-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  confirmPasswordEmpty: 'Please confirm your password.',
  passwordMismatch: "Passwords don't match.",
} as const

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUser: vi.fn(),
  setAccessToken: vi.fn(),
  user: {
    id: 1,
    fullName: 'Jane Doe',
    email: 'a@b.com',
    createdAt: null,
    updatedAt: null,
    initials: 'JD',
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: mocks.setUser,
      setAccessToken: mocks.setAccessToken,
    },
  }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { signUp: vi.fn() },
}))

describe('SignUpForm', () => {
  let screen: RenderResult
  let fullNameInput: Locator
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(authApi.signUp).mockResolvedValue({
      user: mocks.user,
      token: 'test-access-token',
    })

    screen = await render(<SignUpForm />)
    fullNameInput = screen.getByRole('textbox', { name: /^Full name$/i })
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    submitButton = screen.getByRole('button', { name: /^Create Account$/i })
  })

  it('renders fields and submit button', async () => {
    await expect.element(fullNameInput).toBeInTheDocument()
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation messages when submitting empty form', async () => {
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.emailEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty))
      .toBeInTheDocument()
  })

  it('shows a mismatch error when passwords do not match', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '7654321')

    await userEvent.click(submitButton)
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordMismatch))
      .toBeInTheDocument()
  })

  it('disables submit while registering and re-enables after success', async () => {
    let resolveSignUp:
      | ((response: Awaited<ReturnType<typeof authApi.signUp>>) => void)
      | undefined
    vi.mocked(authApi.signUp).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignUp = resolve
        })
    )

    await userEvent.fill(fullNameInput, 'Jane Doe')
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '12345678')
    await userEvent.fill(confirmPasswordInput, '12345678')

    await userEvent.click(submitButton)
    await expect.element(submitButton).toBeDisabled()

    expect(authApi.signUp).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'a@b.com',
      password: '12345678',
      passwordConfirmation: '12345678',
    })

    resolveSignUp?.({ user: mocks.user, token: 'test-access-token' })
    await vi.waitFor(() => expect(mocks.setUser).toHaveBeenCalledOnce())
    expect(mocks.setUser).toHaveBeenCalledWith(mocks.user)
    expect(mocks.setAccessToken).toHaveBeenCalledWith('test-access-token')
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/', replace: true })
    await expect.element(submitButton).toBeEnabled()
  })
})
