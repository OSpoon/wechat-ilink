import { Link } from '@tanstack/react-router'
import { ClerkLogo } from '@/assets/clerk-logo'
import { useAuthStore } from '@/stores/auth-store'
import { CLERK_PUBLISHABLE_KEY } from '@/lib/runtime-config'
import { Button } from '@/components/ui/button'

type ClerkAuthLinkProps = {
  mode: 'sign-in' | 'sign-up'
}

export function ClerkAuthLink({ mode }: ClerkAuthLinkProps) {
  if (!CLERK_PUBLISHABLE_KEY) return null

  const route = mode === 'sign-in' ? '/clerk/sign-in' : '/clerk/sign-up'
  const label =
    mode === 'sign-in' ? 'Continue with Clerk' : 'Sign up with Clerk'

  return (
    <Button variant='outline' className='w-full' asChild>
      <Link to={route} onClick={() => useAuthStore.getState().auth.reset()}>
        <ClerkLogo className='size-4 invert' />
        {label}
      </Link>
    </Button>
  )
}
