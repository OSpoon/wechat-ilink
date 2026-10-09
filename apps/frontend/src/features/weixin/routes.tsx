import { useParams } from '@tanstack/react-router'
import { WebhookDeliveriesPage } from './webhooks/deliveries'

export function WebhookDeliveriesRoute() {
  const { webhookId } = useParams({
    from: '/_authenticated/webhooks/$webhookId/deliveries',
  })
  return <WebhookDeliveriesPage webhookId={webhookId} />
}
