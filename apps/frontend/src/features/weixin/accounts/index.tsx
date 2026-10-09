import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as GlobalSearch } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AccountStatusBadge } from '../components/account-status-badge'
import { QrLoginDialog } from '../components/qr-login-dialog'
import { errorMessage } from '../data/error-message'
import { formatDate } from '../data/message-utils'

export function WeixinAccountsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [bindOpen, setBindOpen] = useState(false)
  const [reconnectMode, setReconnectMode] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<WeixinAccount | null>(
    null
  )
  const accountsQuery = useQuery({
    queryKey: ['weixin', 'accounts'],
    queryFn: weixinApi.accounts.list,
  })
  const action = useMutation({
    mutationFn: ({
      account,
      operation,
    }: {
      account: WeixinAccount
      operation: 'start' | 'stop'
    }) =>
      operation === 'start'
        ? weixinApi.accounts.start(account.id)
        : weixinApi.accounts.stop(account.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['weixin', 'accounts'] })
      toast.success(t('Account status updated.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Account action failed.'))),
  })
  const deleteAccount = useMutation({
    mutationFn: (account: WeixinAccount) =>
      weixinApi.accounts.remove(account.id),
    onSuccess: async () => {
      setAccountToDelete(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['weixin', 'accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['weixin', 'messages'] }),
        queryClient.invalidateQueries({ queryKey: ['weixin', 'webhooks'] }),
      ])
      toast.success(t('WeChat account deleted.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to delete WeChat account.'))),
  })
  const accounts = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return (accountsQuery.data ?? []).filter((account) =>
      `${account.id} ${account.providerAccountId} ${account.ilinkUserId ?? ''}`
        .toLowerCase()
        .includes(needle)
    )
  }, [accountsQuery.data, filter])

  return (
    <>
      <Header fixed>
        <GlobalSearch className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('WeChat accounts')}
            </h1>
            <p className='text-muted-foreground'>
              {t('Connect accounts and manage message reception.')}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => void accountsQuery.refetch()}
              disabled={accountsQuery.isFetching}
            >
              <RefreshCw
                className={accountsQuery.isFetching ? 'animate-spin' : ''}
              />{' '}
              {t('Refresh')}
            </Button>
            <Button
              onClick={() => {
                setReconnectMode(false)
                setBindOpen(true)
              }}
            >
              <Plus /> {t('Bind WeChat account')}
            </Button>
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-3'>
          <MetricCard
            label={t('Total accounts')}
            value={accountsQuery.data?.length ?? 0}
            icon={<Smartphone className='size-4' />}
          />
          <MetricCard
            label={t('Running')}
            value={
              accountsQuery.data?.filter(
                (account) => account.status === 'running'
              ).length ?? 0
            }
            icon={<MessageCircle className='size-4' />}
          />
          <MetricCard
            label={t('Needs attention')}
            value={
              accountsQuery.data?.filter((account) =>
                ['reauth_required', 'error'].includes(account.status)
              ).length ?? 0
            }
            icon={<Smartphone className='size-4' />}
          />
        </div>

        <Card>
          <CardHeader className='gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>{t('Connected accounts')}</CardTitle>
              <CardDescription>
                {t(
                  'Account credentials are encrypted on the server, and each account runs independently.'
                )}
              </CardDescription>
            </div>
            <div className='relative w-full sm:max-w-xs'>
              <Search className='absolute top-2.5 left-2.5 size-4 text-muted-foreground' />
              <Input
                aria-label={t('Search WeChat accounts')}
                className='ps-8'
                placeholder={t('Search account ID or WeChat user ID')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {accountsQuery.isError ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm'>
                {errorMessage(
                  accountsQuery.error,
                  t('Failed to load accounts.')
                )}
                <Button
                  className='ms-3'
                  size='sm'
                  variant='outline'
                  onClick={() => void accountsQuery.refetch()}
                >
                  {t('Retry')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('WeChat account')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Recently received')}</TableHead>
                    <TableHead>{t('Recently sent')}</TableHead>
                    <TableHead className='text-end'>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsQuery.isPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='h-24 text-center text-muted-foreground'
                      >
                        {t('Loading accounts…')}
                      </TableCell>
                    </TableRow>
                  ) : accounts.length ? (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div
                            className='max-w-56 truncate font-medium sm:max-w-xs lg:max-w-sm'
                            title={
                              account.ilinkUserId || account.providerAccountId
                            }
                          >
                            {account.ilinkUserId || account.providerAccountId}
                          </div>
                          <div
                            className='max-w-56 truncate font-mono text-xs text-muted-foreground sm:max-w-xs lg:max-w-sm'
                            title={account.id}
                          >
                            {account.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <AccountStatusBadge status={account.status} />
                        </TableCell>
                        <TableCell>
                          {formatDate(account.lastInboundAt)}
                        </TableCell>
                        <TableCell>
                          {formatDate(account.lastOutboundAt)}
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button asChild size='sm' variant='outline'>
                              <Link
                                to='/chats'
                                search={{ accountId: account.id }}
                              >
                                {t('Open chats')} <MessageCircle />
                              </Link>
                            </Button>
                            <Button
                              size='sm'
                              variant={
                                account.status === 'reauth_required'
                                  ? 'default'
                                  : account.status === 'running'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              disabled={
                                action.isPending ||
                                account.status === 'starting'
                              }
                              onClick={() => {
                                if (account.status === 'reauth_required') {
                                  setReconnectMode(true)
                                  setBindOpen(true)
                                  return
                                }
                                action.mutate({
                                  account,
                                  operation:
                                    account.status === 'running'
                                      ? 'stop'
                                      : 'start',
                                })
                              }}
                            >
                              {account.status === 'running'
                                ? t('Stop')
                                : account.status === 'reauth_required'
                                  ? t('Reconnect')
                                  : t('Start')}
                            </Button>
                            {account.status === 'stopped' &&
                              !account.enabled && (
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  className='text-destructive hover:text-destructive'
                                  aria-label={t(
                                    'Delete WeChat account {{accountId}}',
                                    {
                                      accountId: account.id,
                                    }
                                  )}
                                  title={t('Delete')}
                                  disabled={
                                    action.isPending || deleteAccount.isPending
                                  }
                                  onClick={() => setAccountToDelete(account)}
                                >
                                  <Trash2 />
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className='h-36 text-center'>
                        <div className='mx-auto flex max-w-sm flex-col items-center gap-2'>
                          <Smartphone className='size-8 text-muted-foreground' />
                          <p className='font-medium'>
                            {filter
                              ? t('No matching accounts')
                              : t('No WeChat accounts connected')}
                          </p>
                          {!filter && (
                            <p className='text-sm text-muted-foreground'>
                              {t(
                                'Connect an account to receive messages, manage conversations, and configure webhooks.'
                              )}
                            </p>
                          )}
                          {!filter && (
                            <Button
                              size='sm'
                              onClick={() => {
                                setReconnectMode(false)
                                setBindOpen(true)
                              }}
                            >
                              <Plus /> {t('Connect account')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
      <QrLoginDialog
        open={bindOpen}
        reconnect={reconnectMode}
        onOpenChange={(open) => {
          setBindOpen(open)
          if (!open) setReconnectMode(false)
        }}
      />
      <ConfirmDialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteAccount.isPending) setAccountToDelete(null)
        }}
        title={t('Delete WeChat account?')}
        desc={
          <>
            <p>
              {t('This permanently deletes the stopped account and its data.')}
            </p>
            <p className='mt-2 font-mono text-xs break-all'>
              {accountToDelete?.id}
            </p>
            <p className='mt-2'>
              {t(
                'Its conversations, message history, outbound media, and account webhooks and delivery records will also be deleted.'
              )}
            </p>
          </>
        }
        destructive
        isLoading={deleteAccount.isPending}
        cancelBtnText={t('Cancel')}
        confirmText={t('Delete')}
        handleConfirm={() => {
          if (accountToDelete) deleteAccount.mutate(accountToDelete)
        }}
      />
    </>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <Card className='gap-3 py-4'>
      <CardContent className='flex items-center justify-between px-5'>
        <div>
          <p className='text-sm text-muted-foreground'>{label}</p>
          <p className='mt-1 text-2xl font-semibold'>{value}</p>
        </div>
        <div className='rounded-md bg-primary/10 p-2 text-primary'>{icon}</div>
      </CardContent>
    </Card>
  )
}
