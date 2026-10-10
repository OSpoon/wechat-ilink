import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  apiKeysApi,
  type ApiKey,
  type ApiKeyAccess,
  type CreatedApiKey,
} from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentSection } from './components/content-section'

const apiKeysQueryKey = ['account-api-keys']

function formatDate(value: string | null, language: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function SettingsApiKeys() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const keysQuery = useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: apiKeysApi.list,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [access, setAccess] = useState<ApiKeyAccess>('read_only')
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null)

  const createKey = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: async (key) => {
      setCreatedKey(key)
      setName('')
      await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
      toast.success(t('API key created.'))
    },
    onError: () => toast.error(t('Failed to create API key.')),
  })

  const revokeKey = useMutation({
    mutationFn: apiKeysApi.revoke,
    onSuccess: async () => {
      setKeyToRevoke(null)
      await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
      toast.success(t('API key revoked.'))
    },
    onError: () => toast.error(t('Failed to revoke API key.')),
  })

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) {
      setCreatedKey(null)
      setName('')
      setAccess('read_only')
      setExpiresInDays('90')
    }
  }

  const create = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    createKey.mutate({
      name: trimmedName,
      access,
      expiresInDays: Number(expiresInDays) as 7 | 30 | 90 | 365,
    })
  }

  const copyCreatedKey = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey.token)
      toast.success(t('API key copied.'))
    } catch {
      toast.error(t('Failed to copy API key.'))
    }
  }

  return (
    <ContentSection
      title={t('API Keys')}
      desc={t(
        'Create credentials for external systems to access your WeChat data.'
      )}
      contentClassName='lg:max-w-4xl'
    >
      <>
        <div className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-muted-foreground'>
              {t(
                'API keys are shown only once. Revoke a key immediately if it is no longer needed.'
              )}
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              {t('Create API key')}
            </Button>
          </div>

          {keysQuery.isLoading ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              {t('Loading API keys…')}
            </p>
          ) : keysQuery.isError ? (
            <div className='space-y-3 rounded-lg border p-5 text-center'>
              <p className='text-sm text-destructive'>
                {t('Failed to load API keys.')}
              </p>
              <Button
                variant='outline'
                onClick={() => void keysQuery.refetch()}
              >
                {t('Retry')}
              </Button>
            </div>
          ) : keysQuery.data?.length ? (
            <div className='space-y-3'>
              {keysQuery.data.map((key) => {
                const expired =
                  key.expiresAt !== null && new Date(key.expiresAt) < new Date()
                const canWrite = key.abilities.includes('api:write')
                return (
                  <div
                    key={key.id}
                    className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between'
                  >
                    <div className='min-w-0 space-y-2'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <KeyRound
                          className='size-4 text-muted-foreground'
                          aria-hidden='true'
                        />
                        <p className='truncate font-medium'>{key.name}</p>
                        <Badge variant='secondary'>
                          {t(canWrite ? 'Read and write' : 'Read only')}
                        </Badge>
                        {expired && (
                          <Badge variant='destructive'>{t('Expired')}</Badge>
                        )}
                      </div>
                      <dl className='grid gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2'>
                        <div>
                          <dt className='inline'>{t('Created')}: </dt>
                          <dd className='inline'>
                            {formatDate(key.createdAt, i18n.language) ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className='inline'>{t('Expires')}: </dt>
                          <dd className='inline'>
                            {formatDate(key.expiresAt, i18n.language) ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className='inline'>{t('Last used')}: </dt>
                          <dd className='inline'>
                            {formatDate(key.lastUsedAt, i18n.language) ??
                              t('Never')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='shrink-0 text-destructive hover:text-destructive'
                      onClick={() => setKeyToRevoke(key)}
                    >
                      <Trash2 />
                      {t('Revoke')}
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='rounded-lg border border-dashed px-5 py-10 text-center'>
              <KeyRound
                className='mx-auto mb-3 size-8 text-muted-foreground'
                aria-hidden='true'
              />
              <p className='font-medium'>{t('No API keys yet.')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                {t('Create a key to connect an external system.')}
              </p>
            </div>
          )}
        </div>

        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogContent>
            {createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t('API key created')}</DialogTitle>
                  <DialogDescription>
                    {t(
                      'Copy this key now. You will not be able to see it again.'
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-2'>
                  <Label htmlFor='created-api-key'>{t('API key')}</Label>
                  <div className='flex gap-2'>
                    <Input
                      id='created-api-key'
                      value={createdKey.token}
                      readOnly
                      className='min-w-0 font-mono text-xs'
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => void copyCreatedKey()}
                    >
                      <Copy />
                      {t('Copy')}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => handleCreateOpenChange(false)}>
                    <Check />
                    {t('Done')}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{t('Create API key')}</DialogTitle>
                  <DialogDescription>
                    {t(
                      'Choose a name, access level, and expiration for this integration.'
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='api-key-name'>{t('Name')}</Label>
                    <Input
                      id='api-key-name'
                      value={name}
                      maxLength={60}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('e.g. Order sync service')}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='api-key-access'>{t('Access')}</Label>
                    <Select
                      value={access}
                      onValueChange={(value) =>
                        setAccess(value as ApiKeyAccess)
                      }
                    >
                      <SelectTrigger id='api-key-access' className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='read_only'>
                          {t('Read only')}
                        </SelectItem>
                        <SelectItem value='read_write'>
                          {t('Read and write')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='api-key-expiration'>
                      {t('Expiration')}
                    </Label>
                    <Select
                      value={expiresInDays}
                      onValueChange={setExpiresInDays}
                    >
                      <SelectTrigger id='api-key-expiration' className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='7'>{t('7 days')}</SelectItem>
                        <SelectItem value='30'>{t('30 days')}</SelectItem>
                        <SelectItem value='90'>{t('90 days')}</SelectItem>
                        <SelectItem value='365'>{t('1 year')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => handleCreateOpenChange(false)}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={create}
                    disabled={!name.trim() || createKey.isPending}
                  >
                    <Plus />
                    {t('Create API key')}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(keyToRevoke)}
          onOpenChange={(open) => !open && setKeyToRevoke(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Revoke API key?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  'The integration using this key will lose access immediately.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revokeKey.isPending}>
                {t('Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className='text-destructive-foreground bg-destructive hover:bg-destructive/90'
                disabled={revokeKey.isPending}
                onClick={(event) => {
                  event.preventDefault()
                  if (keyToRevoke) revokeKey.mutate(keyToRevoke.id)
                }}
              >
                {t('Revoke')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </ContentSection>
  )
}
