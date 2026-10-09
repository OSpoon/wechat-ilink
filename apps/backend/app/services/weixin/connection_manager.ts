import {
  accountMustBeStoppedError,
  deleteStoppedAccount,
  findAccountOrFail,
} from './account_service.js'
import { WeixinAccountWorker } from './account_worker.js'

class ConnectionManager {
  private readonly workers = new Map<string, { worker: WeixinAccountWorker; task: Promise<void> }>()
  private readonly starting = new Map<
    string,
    Promise<Awaited<ReturnType<typeof findAccountOrFail>>>
  >()
  private readonly deleting = new Set<string>()

  async start(userId: number, accountId: string) {
    const account = await findAccountOrFail(userId, accountId)
    return this.startExisting(account)
  }

  async startExisting(account: Awaited<ReturnType<typeof findAccountOrFail>>) {
    if (this.deleting.has(account.id)) throw accountMustBeStoppedError()
    if (this.workers.has(account.id)) return account
    const pending = this.starting.get(account.id)
    if (pending) return pending

    const startTask = this.startNew(account)
    this.starting.set(account.id, startTask)
    try {
      return await startTask
    } finally {
      if (this.starting.get(account.id) === startTask) this.starting.delete(account.id)
    }
  }

  private async startNew(account: Awaited<ReturnType<typeof findAccountOrFail>>) {
    if (this.workers.has(account.id)) return account
    account.enabled = true
    await account.save()
    const worker = new WeixinAccountWorker(account)
    const task = worker.run().finally(() => {
      const current = this.workers.get(account.id)
      if (current?.worker === worker) this.workers.delete(account.id)
    })
    this.workers.set(account.id, { worker, task })
    return account
  }

  async stop(userId: number, accountId: string) {
    const account = await findAccountOrFail(userId, accountId)
    if (this.deleting.has(account.id)) throw accountMustBeStoppedError()
    const running = this.workers.get(account.id)
    running?.worker.stop()
    if (running) await running.task
    this.workers.delete(account.id)
    account.enabled = false
    if (account.status !== 'reauth_required') account.status = 'stopped'
    await account.save()
    return account
  }

  async deleteStopped(userId: number, accountId: string) {
    const account = await findAccountOrFail(userId, accountId)
    if (
      account.status !== 'stopped' ||
      account.enabled ||
      this.workers.has(account.id) ||
      this.starting.has(account.id) ||
      this.deleting.has(account.id)
    ) {
      throw accountMustBeStoppedError()
    }

    this.deleting.add(account.id)
    try {
      await deleteStoppedAccount(userId, account.id)
    } finally {
      this.deleting.delete(account.id)
    }
  }

  isRunning(accountId: string) {
    return this.workers.has(accountId)
  }

  stopAll() {
    const running = [...this.workers.values()]
    for (const entry of running) entry.worker.stop()
    return Promise.all(running.map((entry) => entry.task)).then(() => this.workers.clear())
  }
}

export const connectionManager = new ConnectionManager()
