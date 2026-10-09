import { useTranslation } from 'react-i18next'
import type { WeixinAccountStatus } from '@/lib/api-types'
import { Badge } from '@/components/ui/badge'

const statusLabels: Record<WeixinAccountStatus, string> = {
  stopped: 'Stopped',
  starting: 'Starting',
  running: 'Running',
  reauth_required: 'Reconnect required',
  error: 'Error',
}

export function AccountStatusBadge({
  status,
}: {
  status: WeixinAccountStatus
}) {
  const { t } = useTranslation()
  const variant =
    status === 'running'
      ? 'default'
      : status === 'error' || status === 'reauth_required'
        ? 'destructive'
        : 'secondary'

  return <Badge variant={variant}>{t(statusLabels[status])}</Badge>
}
