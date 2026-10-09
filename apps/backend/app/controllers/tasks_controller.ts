import { randomInt } from 'node:crypto'
import DemoTask from '#models/demo_task'
import {
  bulkTaskUpdateValidator,
  bulkCreateTaskValidator,
  createTaskValidator,
  updateTaskValidator,
} from '#validators/demo_resources'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  async index() {
    const tasks = await DemoTask.query().orderBy('rowid', 'asc')
    return { data: tasks }
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createTaskValidator)
    let id = ''

    do {
      id = `TASK-${randomInt(1000, 10000)}`
    } while (await DemoTask.find(id))

    const task = await DemoTask.create({ ...payload, id })
    return response.created({ data: task })
  }

  async bulkStore({ request, response }: HttpContext) {
    const { tasks } = await request.validateUsing(bulkCreateTaskValidator)
    const existingTasks = await DemoTask.query().select('id')
    const existingIds = new Set(existingTasks.map(({ id }) => id))
    const records = []

    for (const task of tasks) {
      let id = ''
      do {
        id = `TASK-${randomInt(1000, 10000)}`
      } while (existingIds.has(id))
      existingIds.add(id)
      records.push({ ...task, id })
    }

    const created = records.length ? await DemoTask.createMany(records) : []
    return response.created({ data: created })
  }

  async update({ request, params, response }: HttpContext) {
    const task = await DemoTask.find(params.id)
    if (!task) return response.notFound({ message: 'Task not found' })

    const payload = await request.validateUsing(updateTaskValidator)
    task.merge(payload)
    await task.save()

    return { data: task }
  }

  async destroy({ params, response }: HttpContext) {
    const task = await DemoTask.find(params.id)
    if (!task) return response.notFound({ message: 'Task not found' })

    await task.delete()
    return response.noContent()
  }

  async bulkUpdate({ request }: HttpContext) {
    const { ids, status, priority } = await request.validateUsing(bulkTaskUpdateValidator)
    const changes: { status?: string; priority?: string } = {}
    if (status) changes.status = status
    if (priority) changes.priority = priority

    if (ids.length && Object.keys(changes).length) {
      await DemoTask.query().whereIn('id', ids).update(changes)
    }

    return { updated: ids.length }
  }

  async bulkDestroy({ request }: HttpContext) {
    const { ids } = await request.validateUsing(bulkTaskUpdateValidator)
    if (ids.length) await DemoTask.query().whereIn('id', ids).delete()
    return { deleted: ids.length }
  }
}
