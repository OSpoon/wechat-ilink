import { create } from 'zustand'
import type { ApiUser } from '@/lib/api-types'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'adonis_access_token'
const LEGACY_PROVIDER_COOKIE = 'asa_auth_provider'

interface AuthState {
  auth: {
    user: ApiUser | null
    setUser: (user: ApiUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
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
  removeCookie(LEGACY_PROVIDER_COOKIE)

  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          if (accessToken) setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          else removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
