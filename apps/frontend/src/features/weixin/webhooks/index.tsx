import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { weixinApi } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export function WebhooksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const accountsQuery = useQuery({
    queryKey: ['weixin', 'accounts'],
    queryFn: weixinApi.accounts.list,
  })
  const webhooksQuery = useQuery({
    queryKey: ['weixin', 'webhooks'],
    queryFn: weixinApi.webhooks.list,
  })
  const createWebhook = useMutation({
    mutationFn: () =>
      weixinApi.webhooks.create({
        accountId,
        url: url.trim(),
        secret,
        events: ['message.received'],
      }),
    onSuccess: async () => {
      setUrl('')
      setSecret('')
      await queryClient.invalidateQueries({ queryKey: ['weixin', 'webhooks'] })
      toast.success(t('Webhook created. Save the signing secret you entered.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to create webhook.'))),
  })
  const removeWebhook = useMutation({
    mutationFn: (id: string) => weixinApi.webhooks.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['weixin', 'webhooks'] })
      setDeleteId(null)
      toast.success(t('Webhook deleted.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to delete webhook.'))),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountId || !url.trim() || secret.trim().length < 16) {
      toast.warning(
        t(
          'Choose an account, enter a valid URL, and provide a signing secret with at least 16 characters.'
        )
      )
      return
    }
    createWebhook.mutate()
  }

  const accountsById = new Map(
    (accountsQuery.data ?? []).map((account) => [account.id, account])
  )

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('Webhooks')}</h1>
          <p className='text-muted-foreground'>
            {t('Securely forward inbound WeChat messages to your service.')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Plus className='size-4' /> {t('Add Webhook')}
            </CardTitle>
            <CardDescription>
              {t(
                'Supports the message.received event. Deliveries use HMAC-SHA256 signatures.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accountsQuery.data?.length ? (
              <form
                className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto]'
                onSubmit={submit}
              >
                <div className='min-w-0 space-y-2'>
                  <Label htmlFor='webhook-account'>{t('WeChat account')}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger
                      id='webhook-account'
                      className='w-full min-w-0'
                    >
                      <SelectValue
                        className='min-w-0 flex-1 truncate'
                        placeholder={t('Choose an account')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accountsQuery.data.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <span
                            className='block max-w-[60vw] truncate sm:max-w-sm'
                            title={
                              account.ilinkUserId || account.providerAccountId
                            }
                          >
                            {account.ilinkUserId || account.providerAccountId}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='webhook-url'>{t('Endpoint URL')}</Label>
                  <Input
                    id='webhook-url'
                    type='url'
                    required
                    maxLength={2048}
                    placeholder='https://example.com/hooks/weixin'
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='webhook-secret'>{t('Signing secret')}</Label>
                  <Input
                    id='webhook-secret'
                    type='password'
                    autoComplete='new-password'
                    minLength={16}
                    maxLength={255}
                    required
                    placeholder={t('At least 16 characters')}
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                  />
                </div>
                <div className='flex items-end'>
                  <Button
                    className='w-full'
                    type='submit'
                    disabled={createWebhook.isPending}
                  >
                    <Plus />{' '}
                    {createWebhook.isPending ? t('Creating…') : t('Add')}
                  </Button>
                </div>
                <p className='text-xs text-muted-foreground lg:col-span-4'>
                  {t(
                    'The secret is submitted only when creating the webhook. It is encrypted on the server and will not be shown again. Store the same secret in your service to verify X-Weixin-Signature.'
                  )}
                </p>
              </form>
            ) : accountsQuery.isPending ? (
              <p className='text-sm text-muted-foreground'>
                {t('Loading WeChat accounts…')}
              </p>
            ) : (
              <p className='text-sm text-muted-foreground'>
                {t('Bind a WeChat account before adding a webhook.')}
              </p>
            )}
            {accountsQuery.isError && (
              <p className='mt-3 text-sm text-destructive'>
                {errorMessage(
                  accountsQuery.error,
                  t('Failed to load WeChat accounts.')
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Configured webhooks')}</CardTitle>
            <CardDescription>
              {t('View recent delivery times and delivery records.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhooksQuery.isError ? (
              <p className='text-sm text-destructive'>
                {errorMessage(
                  webhooksQuery.error,
                  t('Failed to load webhooks.')
                )}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Endpoint')}</TableHead>
                    <TableHead>{t('WeChat account')}</TableHead>
                    <TableHead>{t('Event')}</TableHead>
                    <TableHead>{t('Latest delivery')}</TableHead>
                    <TableHead className='text-end'>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooksQuery.isPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='h-20 text-center text-muted-foreground'
                      >
                        {t('Loading webhooks…')}
                      </TableCell>
                    </TableRow>
                  ) : webhooksQuery.data?.length ? (
                    webhooksQuery.data.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className='max-w-sm'>
                          <div
                            className='truncate font-medium'
                            title={webhook.url}
                          >
                            {webhook.url}
                          </div>
                          <div className='font-mono text-xs text-muted-foreground'>
                            {webhook.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className='max-w-48 truncate sm:max-w-64'
                            title={
                              accountsById.get(webhook.accountId)
                                ?.ilinkUserId || webhook.accountId
                            }
                          >
                            {accountsById.get(webhook.accountId)?.ilinkUserId ||
                              webhook.accountId}
                          </div>
                        </TableCell>
                        <TableCell>{webhook.events.join(', ')}</TableCell>
                        <TableCell>
                          {formatDate(webhook.lastDeliveryAt)}
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button asChild size='sm' variant='outline'>
                              <Link
                                to='/webhooks/$webhookId/deliveries'
                                params={{ webhookId: webhook.id }}
                              >
                                <Activity /> {t('Delivery records')}
                              </Link>
                            </Button>
                            <AlertDialog
                              open={deleteId === webhook.id}
                              onOpenChange={(open) =>
                                setDeleteId(open ? webhook.id : null)
                              }
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  aria-label={t('Delete webhook {{url}}', {
                                    url: webhook.url,
                                  })}
                                  onClick={() => setDeleteId(webhook.id)}
                                >
                                  <Trash2 className='text-destructive' />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t('Delete this webhook?')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t(
                                      'No new deliveries will be created, and existing delivery records will be deleted with the webhook.'
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t('Cancel')}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    disabled={removeWebhook.isPending}
                                    onClick={(event) => {
                                      event.preventDefault()
                                      removeWebhook.mutate(webhook.id)
                                    }}
                                  >
                                    {t('Delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='h-28 text-center text-muted-foreground'
                      >
                        {t('No webhooks configured yet.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className='border-dashed'>
          <CardContent className='flex items-start gap-3 py-4 text-sm text-muted-foreground'>
            <ExternalLink className='mt-0.5 size-4 shrink-0' />
            <p>
              {t(
                "Deliveries include the X-Weixin-Event, X-Weixin-Delivery, and X-Weixin-Signature headers. Review each webhook's delivery records to troubleshoot failures and retries."
              )}
            </p>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
