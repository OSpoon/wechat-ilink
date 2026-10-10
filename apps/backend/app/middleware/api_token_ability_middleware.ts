import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ApiTokenAbilityMiddleware {
  async handle({ auth, request, response }: HttpContext, next: NextFn) {
    const token = auth.getUserOrFail().currentAccessToken
    const ability = ['GET', 'HEAD'].includes(request.method()) ? 'api:read' : 'api:write'

    if (token?.allows('*') || token?.allows(ability)) {
      return next()
    }

    return response.forbidden({
      error: {
        code: 'TOKEN_ABILITY_REQUIRED',
        message: `This API token does not allow ${ability} access`,
      },
    })
  }
}
