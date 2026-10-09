import { createFileRoute } from '@tanstack/react-router'
import { WebhookDeliveriesRoute } from '@/features/weixin/routes'

export const Route = createFileRoute(
  '/_authenticated/webhooks/$webhookId/deliveries'
)({
  component: WebhookDeliveriesRoute,
})
