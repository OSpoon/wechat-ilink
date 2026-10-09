import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { weixinApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { errorMessage } from '../data/error-message'
import { formatDate } from '../data/message-utils'

const statusLabel = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
} as const

export function WebhookDeliveriesPage({ webhookId }: { webhookId: string }) {
  const { t } = useTranslation()
  const deliveriesQuery = useQuery({
    queryKey: ['weixin', 'webhooks', webhookId, 'deliveries'],
    queryFn: () => weixinApi.webhooks.deliveries(webhookId),
  })

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
            <Button asChild variant='ghost' size='sm' className='-ms-3 mb-2'>
              <Link to='/webhooks'>
                <ArrowLeft /> {t('Return to Webhooks')}
              </Link>
            </Button>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('Deliveries')}
            </h1>
            <p className='font-mono text-sm text-muted-foreground'>
              {webhookId}
            </p>
          </div>
          <Button
            variant='outline'
            disabled={deliveriesQuery.isFetching}
            onClick={() => void deliveriesQuery.refetch()}
          >
            <RefreshCw
              className={deliveriesQuery.isFetching ? 'animate-spin' : ''}
            />{' '}
            {t('Refresh')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('Message delivery')}</CardTitle>
            <CardDescription>
              {t('Shows attempts, the latest error, and the next retry time.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deliveriesQuery.isError ? (
              <p className='text-sm text-destructive'>
                {errorMessage(
                  deliveriesQuery.error,
                  t('Failed to load delivery records.')
                )}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Event')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Attempts')}</TableHead>
                    <TableHead>{t('Created at')}</TableHead>
                    <TableHead>{t('Next retry / completed at')}</TableHead>
                    <TableHead>{t('Latest error')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveriesQuery.isPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='h-20 text-center text-muted-foreground'
                      >
                        {t('Loading deliveries…')}
                      </TableCell>
                    </TableRow>
                  ) : deliveriesQuery.data?.length ? (
                    deliveriesQuery.data.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <div className='font-medium'>
                            {delivery.eventType}
                          </div>
                          <div
                            className='max-w-52 truncate font-mono text-xs text-muted-foreground'
                            title={delivery.eventId}
                          >
                            {delivery.eventId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              delivery.status === 'delivered'
                                ? 'default'
                                : delivery.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {t(statusLabel[delivery.status])}
                          </Badge>
                        </TableCell>
                        <TableCell>{delivery.attempts}</TableCell>
                        <TableCell>{formatDate(delivery.createdAt)}</TableCell>
                        <TableCell>
                          {formatDate(
                            delivery.deliveredAt || delivery.nextAttemptAt
                          )}
                        </TableCell>
                        <TableCell className='max-w-xs text-xs whitespace-normal text-muted-foreground'>
                          {delivery.lastError ? t(delivery.lastError) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='h-28 text-center text-muted-foreground'
                      >
                        {t('No delivery records yet.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
