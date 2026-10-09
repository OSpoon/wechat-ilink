import { createFileRoute } from '@tanstack/react-router'
import { WeixinAccountsPage } from '@/features/weixin/accounts'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: WeixinAccountsPage,
})
