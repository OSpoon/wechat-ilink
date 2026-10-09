/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api'

export const Route = createFileRoute('/clerk/complete')({
  component: ClerkComplete,
})

function ClerkComplete() {
  const navigate = useNavigate({ from: '/clerk/complete' })
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      void navigate({ to: '/clerk/sign-in', replace: true })
      return
    }

    const { auth } = useAuthStore.getState()
    auth.setProvider('clerk')

    let active = true
    void authApi
      .profile()
      .then((user) => {
        if (!active) return
        useAuthStore.getState().auth.setUser(user)
        void navigate({ to: '/', replace: true })
      })
      .catch(() => {
        if (!active) return
        useAuthStore.getState().auth.reset()
        void navigate({ to: '/clerk/sign-in', replace: true })
      })

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, navigate])

  return (
    <div className='flex h-svh items-center justify-center'>
      <Loader2 className='size-8 animate-spin' aria-label='Signing in' />
    </div>
  )
}
