import { create } from 'zustand'
import type { ApiUser } from '@/lib/api-types'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { CLERK_PUBLISHABLE_KEY } from '@/lib/runtime-config'

const ACCESS_TOKEN = 'adonis_access_token'
const AUTH_PROVIDER = 'asa_auth_provider'

export type AuthProvider = 'adonis' | 'clerk'

function readProvider() {
  try {
    const provider = getCookie(AUTH_PROVIDER)
    if (provider) {
      const value = JSON.parse(provider)
      if (value === 'adonis' || value === 'clerk') return value as AuthProvider
    }
  } catch {
    removeCookie(AUTH_PROVIDER)
  }
  return null
}

interface AuthState {
  auth: {
    user: ApiUser | null
    setUser: (user: ApiUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    provider: AuthProvider | null
    setProvider: (provider: AuthProvider | null) => void
    clerkAuthLoaded: boolean
    setClerkAuthLoaded: (loaded: boolean) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  let initToken = ''
  try {
    initToken = cookieState ? JSON.parse(cookieState) : ''
  } catch {
    removeCookie(ACCESS_TOKEN)
  }
  const initialProvider = readProvider() ?? (initToken ? 'adonis' : null)
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      provider: initialProvider,
      clerkAuthLoaded: !CLERK_PUBLISHABLE_KEY,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          const provider = accessToken ? 'adonis' : null
          if (provider) setCookie(AUTH_PROVIDER, JSON.stringify(provider))
          else removeCookie(AUTH_PROVIDER)
          return { ...state, auth: { ...state.auth, accessToken, provider } }
        }),
      setProvider: (provider) =>
        set((state) => {
          if (provider) setCookie(AUTH_PROVIDER, JSON.stringify(provider))
          else removeCookie(AUTH_PROVIDER)
          return { ...state, auth: { ...state.auth, provider } }
        }),
      setClerkAuthLoaded: (clerkAuthLoaded) =>
        set((state) => ({
          ...state,
          auth: { ...state.auth, clerkAuthLoaded },
        })),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(AUTH_PROVIDER)
          return {
            ...state,
            auth: { ...state.auth, accessToken: '', provider: null },
          }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(AUTH_PROVIDER)
          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              accessToken: '',
              provider: null,
            },
          }
        }),
    },
  }
})

export async function waitForClerkAuthLoaded() {
  if (useAuthStore.getState().auth.clerkAuthLoaded) return

  await new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.auth.clerkAuthLoaded) return
      unsubscribe()
      resolve()
    })

    if (useAuthStore.getState().auth.clerkAuthLoaded) {
      unsubscribe()
      resolve()
    }
  })
}
