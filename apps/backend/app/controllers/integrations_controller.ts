import Integration from '#models/integration'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const connectedValidator = vine.create({ connected: vine.boolean() })

export default class IntegrationsController {
  async index() {
    const integrations = await Integration.query().orderBy('rowid', 'asc')
    return { data: integrations }
  }

  async update({ request, params, response }: HttpContext) {
    const integration = await Integration.find(params.name)
    if (!integration) return response.notFound({ message: 'Integration not found' })

    const { connected } = await request.validateUsing(connectedValidator)
    integration.connected = connected
    await integration.save()
    return { data: integration }
  }
}
