import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  MessageCircle,
  Plus,
  Radio,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { weixinApi } from '@/lib/api'
import type { WeixinAccount } from '@/lib/api-types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AccountStatusBadge } from '@/features/weixin/components/account-status-badge'
import { errorMessage } from '@/features/weixin/data/error-message'
import { formatDate } from '@/features/weixin/data/message-utils'

export function Dashboard() {
  const { t } = useTranslation()
  const accountsQuery = useQuery({
    queryKey: ['weixin', 'accounts'],
    queryFn: weixinApi.accounts.list,
  })
  const webhooksQuery = useQuery({
    queryKey: ['weixin', 'webhooks'],
    queryFn: weixinApi.webhooks.list,
  })
  const accounts = accountsQuery.data ?? []
  const runningCount = accounts.filter(
    (account) => account.status === 'running'
  ).length
  const attentionCount = accounts.filter((account) =>
    ['reauth_required', 'error'].includes(account.status)
  ).length
  const latestAccount = [...accounts].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  )[0]
  const busy = accountsQuery.isFetching || webhooksQuery.isFetching

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('Dashboard')}
            </h1>
            <p className='text-muted-foreground'>
              {t(
                'Overview of your WeChat connections, messages, and webhook activity.'
              )}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => {
                void accountsQuery.refetch()
                void webhooksQuery.refetch()
              }}
            >
              <RefreshCw className={busy ? 'animate-spin' : ''} />{' '}
              {t('Refresh')}
            </Button>
            <Button asChild>
              <Link to='/accounts'>
                <Plus /> {t('Bind WeChat')}
              </Link>
            </Button>
          </div>
        </div>

        {(accountsQuery.isError || webhooksQuery.isError) && (
          <div className='rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>
            {errorMessage(
              accountsQuery.error ?? webhooksQuery.error,
              t('Failed to load dashboard data.')
            )}
          </div>
        )}

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard
            label={t('WeChat accounts')}
            value={accounts.length}
            hint={t('Connected accounts')}
            icon={<Smartphone />}
          />
          <MetricCard
            label={t('Running')}
            value={runningCount}
            hint={t('Healthy connections')}
            icon={<Activity />}
            tone='green'
          />
          <MetricCard
            label={t('Needs attention')}
            value={attentionCount}
            hint={t('Errors or reconnection required')}
            icon={<Smartphone />}
            tone={attentionCount ? 'orange' : 'default'}
          />
          <MetricCard
            label={t('Webhooks')}
            value={webhooksQuery.data?.length ?? 0}
            hint={t('Configured delivery endpoints')}
            icon={<Radio />}
            tone='purple'
          />
        </div>

        <div className='grid gap-6 xl:grid-cols-2'>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t('Account status')}</CardTitle>
                <CardDescription>
                  {t('Recently updated WeChat connections')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {accountsQuery.isPending ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  {t('Loading accounts…')}
                </p>
              ) : accounts.length ? (
                <div className='divide-y'>
                  {[...accounts]
                    .sort(
                      (left, right) =>
                        Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
                    )
                    .slice(0, 5)
                    .map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                </div>
              ) : (
                <div className='py-10 text-center'>
                  <Smartphone className='mx-auto size-8 text-muted-foreground' />
                  <p className='mt-3 font-medium'>
                    {t('No WeChat accounts connected')}
                  </p>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {t('Connect an account to receive and manage messages.')}
                  </p>
                  <Button asChild size='sm' className='mt-4'>
                    <Link to='/accounts'>
                      <Plus /> {t('Connect account')}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Recent activity')}</CardTitle>
              <CardDescription>
                {t('Last account status update')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-start gap-3 rounded-lg border p-4'>
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${latestAccount ? (['error', 'reauth_required'].includes(latestAccount.status) ? 'bg-destructive' : 'bg-emerald-500') : 'bg-muted-foreground/50'}`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
                    <p className='font-medium'>
                      {latestAccount
                        ? t('Account status synchronized')
                        : t('Waiting for first connection')}
                    </p>
                    {latestAccount && (
                      <AccountStatusBadge status={latestAccount.status} />
                    )}
                  </div>
                  {latestAccount ? (
                    <div className='mt-1 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                      <p
                        className='min-w-0 truncate text-sm text-muted-foreground'
                        title={
                          latestAccount.ilinkUserId ||
                          latestAccount.providerAccountId
                        }
                      >
                        {latestAccount.ilinkUserId ||
                          latestAccount.providerAccountId}
                      </p>
                      <p className='shrink-0 text-xs text-muted-foreground sm:whitespace-nowrap'>
                        {formatDate(latestAccount.updatedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {t(
                        'Recent activity will appear here after you connect WeChat.'
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className='mt-4 space-y-2'>
                <QuickLink
                  to='/chats'
                  icon={<MessageCircle />}
                  title={t('Open WeChat chats')}
                  description={t('Review and reply to incoming messages')}
                />
                <QuickLink
                  to='/webhooks'
                  icon={<Radio />}
                  title={t('Review webhook deliveries')}
                  description={t('Manage endpoints and inspect failed retries')}
                />
                <QuickLink
                  to='/accounts'
                  icon={<Smartphone />}
                  title={t('Manage WeChat accounts')}
                  description={t('Connect, stop, or restart accounts')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  hint: string
  icon: ReactNode
  tone?: 'default' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    orange: 'bg-orange-500/10 text-orange-600',
    purple: 'bg-violet-500/10 text-violet-600',
  }[tone]
  return (
    <Card className='gap-3 py-5'>
      <CardContent className='flex items-start justify-between px-5'>
        <div>
          <p className='text-sm text-muted-foreground'>{label}</p>
          <p className='mt-2 text-2xl font-bold'>{value}</p>
          <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>
        </div>
        <span className={`rounded-md p-2 ${toneClass}`}>{icon}</span>
      </CardContent>
    </Card>
  )
}

function AccountRow({ account }: { account: WeixinAccount }) {
  return (
    <Link
      to='/chats'
      search={{ accountId: account.id }}
      className='flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60'
    >
      <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
        We
      </span>
      <span className='min-w-0 flex-1'>
        <span
          className='block truncate text-sm font-medium'
          title={account.ilinkUserId || account.providerAccountId}
        >
          {account.ilinkUserId || account.providerAccountId}
        </span>
        <span
          className='block truncate font-mono text-xs text-muted-foreground'
          title={account.id}
        >
          {account.id}
        </span>
      </span>
      <AccountStatusBadge status={account.status} />
    </Link>
  )
}

function QuickLink({
  to,
  icon,
  title,
  description,
}: {
  to: '/chats' | '/webhooks' | '/accounts'
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Button
      asChild
      variant='ghost'
      className='h-auto w-full justify-start px-3 py-3'
    >
      <Link to={to} className='flex gap-3'>
        <span className='mt-0.5 text-muted-foreground'>{icon}</span>
        <span className='flex-1 text-start'>
          <span className='block font-medium'>{title}</span>
          <span className='block text-xs font-normal text-muted-foreground'>
            {description}
          </span>
        </span>
        <ArrowRight className='ms-auto text-muted-foreground' />
      </Link>
    </Button>
  )
}
