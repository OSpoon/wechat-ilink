import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@clerk/react'
import { useAuthStore } from '@/stores/auth-store'
import { registerClerkSession } from '@/lib/clerk-session'

type ClerkSessionBridgeProps = {
  children: ReactNode
}

export function ClerkSessionBridge({ children }: ClerkSessionBridgeProps) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()

  registerClerkSession(getToken, async () => {
    await signOut()
  })

  useEffect(() => {
    if (!isLoaded) return

    const { auth } = useAuthStore.getState()
    if (auth.provider === 'adonis' && auth.accessToken) {
      auth.setClerkAuthLoaded(true)
      return
    }

    if (!isSignedIn) {
      if (auth.provider === 'clerk') auth.reset()
      useAuthStore.getState().auth.setClerkAuthLoaded(true)
      return
    }

    auth.setClerkAuthLoaded(true)
  }, [isLoaded, isSignedIn])

  return children
}
