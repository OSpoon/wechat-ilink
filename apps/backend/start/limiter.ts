import limiter from '@adonisjs/limiter/services/main'

/** General API protection, keyed by authenticated user when available. */
export const apiThrottle = limiter.define('api', (ctx) => {
  const key = ctx.auth.user ? `user:${ctx.auth.user.id}` : `ip:${ctx.request.ip()}`

  return limiter.allowRequests(120).every('1 minute').usingKey(key)
})

/** QR login is expensive and must not be used as a token oracle. */
export const qrThrottle = limiter.define('qr', (ctx) => {
  const key = ctx.auth.user ? `user:${ctx.auth.user.id}` : `ip:${ctx.request.ip()}`

  return limiter.allowRequests(10).every('10 minutes').usingKey(key)
})
