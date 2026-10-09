import type { HttpContext } from '@adonisjs/core/http'
import { ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import db from '@adonisjs/lucid/services/db'
import {
  ErrorResponseDocument,
  HealthLiveDocument,
  HealthReadyDocument,
  ServiceInfoDocument,
} from '#openapi/schemas'

export default class SystemController {
  @ApiOperation({ summary: '服务根信息', description: '返回 API 服务的基础信息。' })
  @ApiResponse({
    status: 200,
    description: '返回服务基础信息。',
    type: ServiceInfoDocument,
  })
  async index() {
    return { message: '欢迎使用微信 iLink API 服务。' }
  }

  @ApiOperation({ summary: '存活检查', description: '检查 API 进程是否正在运行。' })
  @ApiResponse({ status: 200, description: 'API 进程正常运行。', type: HealthLiveDocument })
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }

  @ApiOperation({
    summary: '就绪检查',
    description: '检查 API 服务及 SQLite 数据库是否已就绪。',
  })
  @ApiResponse({ status: 200, description: 'API 服务和数据库已就绪。', type: HealthReadyDocument })
  @ApiResponse({
    status: 503,
    description: '数据库暂不可用。',
    type: ErrorResponseDocument,
  })
  async ready({ response }: HttpContext) {
    try {
      await db.rawQuery('select 1')
      return response.ok({ status: 'ok', database: 'ok' })
    } catch {
      return response.serviceUnavailable({
        status: 'unavailable',
        database: 'unavailable',
      })
    }
  }
}
