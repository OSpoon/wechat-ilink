import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { weixinApi } from '@/lib/api'
import type { WeixinLoginSession, WeixinLoginStatus } from '@/lib/api-types'
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

const terminalStatuses: WeixinLoginStatus[] = [
  'confirmed',
  'already_connected',
  'failed',
  'expired',
  'cancelled',
]

const statusLabels: Record<WeixinLoginStatus, string> = {
  waiting_scan: 'Waiting for QR scan',
  scanned: 'Scanned. Confirm on your phone.',
  need_verifycode: 'Security verification required',
  verifying: 'Verifying…',
  confirmed: 'Account connected',
  already_connected: 'This account is already connected',
  failed: 'Login failed',
  expired: 'QR code expired',
  cancelled: 'Login cancelled',
}

export function QrLoginDialog({
  open,
  reconnect = false,
  onOpenChange,
}: {
  open: boolean
  reconnect?: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [session, setSession] = useState<WeixinLoginSession | null>(null)
  const [qrImage, setQrImage] = useState<{
    url: string
    dataUrl: string
  } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [pollingFailed, setPollingFailed] = useState(false)
  const isTerminal = session ? terminalStatuses.includes(session.status) : false
  const isSuccess =
    session?.status === 'confirmed' ||
    (session?.status === 'already_connected' && !reconnect)

  const createSession = useCallback(async () => {
    setSession(null)
    setQrImage(null)
    setVerifyCode('')
    setPollingFailed(false)
    setBusy(true)
    try {
      setSession(await weixinApi.login.create())
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Create login session failed.')
      )
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }, [onOpenChange, t])

  const sessionId = session?.id
  const qrUrl = session?.qrUrl

  useEffect(() => {
    if (open && !sessionId && !busy) void Promise.resolve().then(createSession)
  }, [busy, createSession, open, sessionId])

  useEffect(() => {
    if (!qrUrl) return
    let active = true
    void QRCode.toDataURL(qrUrl, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (active) setQrImage({ url: qrUrl, dataUrl })
      })
      .catch(() => {
        if (active) toast.error(t('QR code could not be rendered. Try again.'))
      })
    return () => {
      active = false
    }
  }, [qrUrl, t])

  const qrImageUrl = qrImage && qrImage.url === qrUrl ? qrImage.dataUrl : ''

  useEffect(() => {
    if (!open || !sessionId || isTerminal) return
    let active = true
    let timer: number | undefined
    const poll = async () => {
      try {
        const nextSession = await weixinApi.login.get(sessionId)
        if (!active) return
        setSession(nextSession)
        setPollingFailed(false)
        if (
          nextSession.status === 'confirmed' ||
          nextSession.status === 'already_connected'
        ) {
          void queryClient.invalidateQueries({
            queryKey: ['weixin', 'accounts'],
          })
        }
        if (terminalStatuses.includes(nextSession.status)) return
      } catch {
        if (active) setPollingFailed(true)
      }
      timer = window.setTimeout(() => void poll(), 1500)
    }
    void poll()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [isTerminal, open, queryClient, sessionId])

  async function closeDialog(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (session && !isTerminal) {
      await weixinApi.login.cancel(session.id).catch(() => undefined)
    }
    setSession(null)
    setQrImage(null)
    setVerifyCode('')
    setPollingFailed(false)
    onOpenChange(false)
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !verifyCode.trim()) return
    setBusy(true)
    try {
      setSession(await weixinApi.login.verify(session.id, verifyCode.trim()))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Verification code submission failed.')
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void closeDialog(nextOpen)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <QrCode className='size-5' />{' '}
            {t(reconnect ? 'Reconnect WeChat account' : 'Bind WeChat account')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Scan the QR code with WeChat. This page will update when the account is connected.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex min-h-72 flex-col items-center justify-center gap-4 py-2 text-center'>
          {busy && !session ? (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <LoaderCircle className='size-4 animate-spin' />{' '}
              {t('Creating login session…')}
            </div>
          ) : session ? (
            <>
              <div className='text-sm font-medium'>
                {t(statusLabels[session.status])}
              </div>
              {!isTerminal && session.qrUrl && (
                <div className='rounded-xl border bg-white p-3 shadow-sm'>
                  {qrImageUrl ? (
                    <img
                      src={qrImageUrl}
                      alt={t('WeChat login QR code')}
                      className='size-60'
                    />
                  ) : (
                    <div className='flex size-60 items-center justify-center text-muted-foreground'>
                      <LoaderCircle className='size-6 animate-spin' />
                    </div>
                  )}
                </div>
              )}
              {session.status === 'need_verifycode' && (
                <form className='flex w-full gap-2' onSubmit={submitCode}>
                  <Input
                    aria-label={t('WeChat security code')}
                    inputMode='numeric'
                    maxLength={8}
                    placeholder={t('Enter the code shown in WeChat')}
                    value={verifyCode}
                    onChange={(event) =>
                      setVerifyCode(event.target.value.replace(/\D/g, ''))
                    }
                  />
                  <Button type='submit' disabled={busy || !verifyCode}>
                    {t('Submit')}
                  </Button>
                </form>
              )}
              {session.errorMessage && (
                <p className='text-sm text-destructive'>
                  {t(session.errorMessage)}
                </p>
              )}
              {pollingFailed && (
                <p className='text-sm text-destructive'>
                  {t('Unable to refresh QR login status. Retrying…')}
                </p>
              )}
              {isSuccess && (
                <p className='flex items-center gap-2 text-sm text-emerald-600'>
                  <CheckCircle2 className='size-4' />{' '}
                  {t(
                    'The WeChat account is connected and available in your account list.'
                  )}
                </p>
              )}
              {isTerminal && !isSuccess && (
                <p className='text-sm text-muted-foreground'>
                  {t('Close this dialog to generate a new QR code.')}
                </p>
              )}
              {!isTerminal && session.qrUrl && (
                <a
                  className='text-sm text-primary underline underline-offset-4'
                  href={session.qrUrl}
                  target='_blank'
                  rel='noreferrer'
                >
                  {t("Can't scan? Open the WeChat login link")}
                </a>
              )}
            </>
          ) : (
            <div className='text-sm text-muted-foreground'>
              {t('Preparing QR code…')}
            </div>
          )}
        </div>

        <DialogFooter>
          {isTerminal && !isSuccess && (
            <Button
              variant='outline'
              onClick={() => void createSession()}
              disabled={busy}
            >
              {t('Generate a new QR code')}
            </Button>
          )}
          <Button
            variant={isSuccess ? 'default' : 'outline'}
            onClick={() => void closeDialog(false)}
          >
            {isTerminal ? t('Done') : t('Cancel login')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
