import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class FullAccessTokenMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const token = auth.getUserOrFail().currentAccessToken

    if (token?.allows('*')) {
      return next()
    }

    return response.forbidden({
      error: {
        code: 'FULL_ACCESS_TOKEN_REQUIRED',
        message: 'A full-access account token is required to manage API keys',
      },
    })
  }
}
