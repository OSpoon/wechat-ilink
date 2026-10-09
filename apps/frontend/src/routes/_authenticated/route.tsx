import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore, waitForClerkAuthLoaded } from '@/stores/auth-store'
import { authApi } from '@/lib/api'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    await waitForClerkAuthLoaded()
    const { auth } = useAuthStore.getState()
    const signInRoute =
      auth.provider === 'clerk' ? '/clerk/sign-in' : '/sign-in'

    if (auth.provider !== 'clerk' && !auth.accessToken) {
      throw redirect({
        to: signInRoute,
        search: { redirect: location.href },
      })
    }

    if (auth.user) return

    try {
      auth.setUser(await authApi.profile())
    } catch {
      auth.reset()
      throw redirect({
        to: signInRoute,
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
