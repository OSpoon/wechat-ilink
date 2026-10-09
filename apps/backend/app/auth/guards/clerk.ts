import { verifyToken } from '@clerk/backend'
import { errors, symbols } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import type ClerkIdentityService from '#services/clerk_identity_service'

type ClerkGuardOptions = {
  secretKey?: string
  authorizedParties?: string[]
}

type ClerkGuardDependencies = {
  verifyToken: typeof verifyToken
  identityService: Pick<ClerkIdentityService, 'findOrCreateLocalUser'>
}

export class ClerkGuard implements GuardContract<User> {
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  readonly driverName = 'clerk'
  authenticationAttempted = false
  isAuthenticated = false
  user?: User

  #ctx: HttpContext
  #options: ClerkGuardOptions
  #verifyToken: typeof verifyToken
  #identityService: ClerkGuardDependencies['identityService'] | null

  constructor(
    ctx: HttpContext,
    options: ClerkGuardOptions,
    dependencies: Partial<ClerkGuardDependencies> = {}
  ) {
    this.#ctx = ctx
    this.#options = options
    this.#verifyToken = dependencies.verifyToken ?? verifyToken
    this.#identityService = dependencies.identityService ?? null
  }

  async authenticate() {
    if (this.authenticationAttempted) return this.getUserOrFail()
    this.authenticationAttempted = true

    const authorization = this.#ctx.request.header('authorization')
    const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? []
    if (scheme?.toLowerCase() !== 'bearer' || !token || !this.#options.secretKey) {
      throw this.#unauthorized()
    }

    let clerkUserId: string | undefined
    try {
      const claims = await this.#verifyToken(token, {
        secretKey: this.#options.secretKey,
        ...(this.#options.authorizedParties?.length
          ? { authorizedParties: this.#options.authorizedParties }
          : {}),
      })
      clerkUserId = typeof claims.sub === 'string' ? claims.sub : undefined
    } catch {
      throw this.#unauthorized()
    }

    if (!clerkUserId) throw this.#unauthorized()

    let identityService = this.#identityService
    if (!identityService) {
      const { default: ClerkIdentityService } = await import('#services/clerk_identity_service')
      identityService = new ClerkIdentityService()
    }
    const user = await identityService.findOrCreateLocalUser(clerkUserId, this.#options.secretKey)
    if (!user) throw this.#unauthorized()

    this.user = user
    this.isAuthenticated = true
    return user
  }

  async check() {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  getUserOrFail() {
    if (!this.user) throw this.#unauthorized()
    return this.user
  }

  async authenticateAsClient(_user: User): Promise<AuthClientResponse> {
    throw new Error('Clerk authentication tests must provide a Clerk-issued session token')
  }

  #unauthorized() {
    return new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
      guardDriverName: this.driverName,
    })
  }
}
