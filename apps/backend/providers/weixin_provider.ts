import type { ApplicationService } from '@adonisjs/core/types'
import WeixinAccount from '#models/weixin_account'
import { connectionManager } from '#services/weixin/connection_manager'
import { retryPendingWebhookDeliveries } from '#services/weixin/webhook_service'

export default class WeixinProvider {
  private retryTimer?: ReturnType<typeof setInterval>

  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getMode() !== 'run' || this.app.getEnvironment() !== 'web') return

    const accounts = await WeixinAccount.query().where('enabled', true)
    for (const account of accounts) void connectionManager.startExisting(account)

    await retryPendingWebhookDeliveries()
    this.retryTimer = setInterval(() => {
      void retryPendingWebhookDeliveries().catch(() => undefined)
    }, 5_000)
  }

  async shutdown() {
    if (this.retryTimer) clearInterval(this.retryTimer)
    await connectionManager.stopAll()
  }
}
