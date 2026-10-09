import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'
import { ClerkGuard } from '#auth/guards/clerk'
import env from '#start/env'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'api',

  guards: {
    /**
     * Token-based guard for stateless API authentication.
     */
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user'),
      }),
    }),

    /**
     * Clerk session tokens are accepted alongside native Adonis access tokens.
     */
    clerk: (ctx) =>
      new ClerkGuard(ctx, {
        secretKey: env.get('CLERK_SECRET_KEY'),
        authorizedParties: env
          .get('CLERK_AUTHORIZED_PARTIES')
          ?.split(',')
          .map((party) => party.trim())
          .filter(Boolean),
      }),

    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
       */
      useRememberMeTokens: false,

      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
