/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ExternalLink, Key } from 'lucide-react'
import { CLERK_PUBLISHABLE_KEY } from '@/lib/runtime-config'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ConfigDrawer } from '@/components/config-drawer'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/clerk')({
  component: RouteComponent,
})

// Import your Publishable Key
function RouteComponent() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkPubKey />
  }

  return <Outlet />
}

function MissingClerkPubKey() {
  const codeBlock =
    'bg-foreground/10 rounded-sm py-0.5 px-1 text-xs text-foreground font-bold'
  return (
    <AuthenticatedLayout>
      <div className='bg-backgroundh-16 flex justify-between p-4'>
        <SidebarTrigger variant='outline' className='scale-125 sm:scale-100' />
        <div className='space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
        </div>
      </div>
      <Main className='flex flex-col items-center justify-start'>
        <div className='max-w-2xl'>
          <Alert>
            <Key className='size-4' />
            <AlertTitle>No Publishable Key Found!</AlertTitle>
            <AlertDescription>
              <p className='text-balance'>
                You need to generate a publishable key from Clerk and put it
                inside the <code className={codeBlock}>.env</code> file.
              </p>
            </AlertDescription>
          </Alert>

          <h1 className='mt-4 text-2xl font-bold'>Set your Clerk API key</h1>
          <div className='mt-4 flex flex-col gap-y-4 text-foreground/75'>
            <ol className='list-inside list-decimal space-y-1.5'>
              <li>
                In the{' '}
                <a
                  href='https://go.clerk.com/GttUAaK'
                  target='_blank'
                  className='underline decoration-dashed underline-offset-4 hover:decoration-solid'
                >
                  Clerk
                  <sup>
                    <ExternalLink className='inline-block size-4' />
                  </sup>
                </a>{' '}
                Dashboard, navigate to the API keys page.
              </li>
              <li>
                In the <strong>Quick Copy</strong> section, copy your Clerk
                Publishable Key.
              </li>
              <li>
                Rename <code className={codeBlock}>.env.example</code> to{' '}
                <code className={codeBlock}>.env</code>
              </li>
              <li>
                Paste your key into your <code className={codeBlock}>.env</code>{' '}
                file.
              </li>
            </ol>
            <p>The final result should resemble the following:</p>

            <div className='@container space-y-2 rounded-md bg-slate-800 px-3 py-3 text-sm text-slate-200'>
              <span className='ps-1'>.env</span>
              <pre className='overflow-auto overscroll-x-contain rounded bg-slate-950 px-2 py-1 text-xs'>
                <code>
                  <span className='before:text-slate-400 md:before:pe-2 md:before:content-["1."]'>
                    VITE_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
                  </span>
                </code>
              </pre>
            </div>
          </div>

          <Separator className='my-4 w-full' />

          <Alert>
            <AlertTitle>
              Clerk is an Optional Authentication Provider
            </AlertTitle>
            <AlertDescription>
              <p className='text-balance'>
                Clerk can be used alongside the built-in AdonisJS sign-in. Set
                both the frontend publishable key and backend secret key to
                authenticate API requests with a Clerk session.
              </p>
              <p>
                After signing in, the backend verifies your Clerk session and
                links the identity to a local SQLite user.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </Main>
    </AuthenticatedLayout>
  )
}
