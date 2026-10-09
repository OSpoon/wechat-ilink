import { randomUUID } from 'node:crypto'
import DirectoryUser from '#models/directory_user'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import {
  bulkDirectoryUserValidator,
  createDirectoryUserValidator,
  inviteDirectoryUserValidator,
  updateDirectoryUserValidator,
} from '#validators/demo_resources'
import type { HttpContext } from '@adonisjs/core/http'

export default class DirectoryUsersController {
  async index() {
    const users = await DirectoryUser.query().orderBy('rowid', 'asc')
    return { data: users }
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createDirectoryUserValidator)
    const { password, ...profile } = payload
    const conflict = await DirectoryUser.query()
      .where('email', profile.email)
      .orWhere('username', profile.username)
      .first()
    const authConflict = await User.findBy('email', profile.email)
    if (conflict || authConflict) {
      return response.conflict({ message: 'Email or username already exists' })
    }

    const user = await db.transaction(async (transaction) => {
      const authUser = await User.create(
        {
          fullName: `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
          password,
        },
        { client: transaction }
      )
      return DirectoryUser.create(
        {
          ...profile,
          id: randomUUID(),
          authUserId: authUser.id,
          status: 'active',
        },
        { client: transaction }
      )
    })
    return response.created({ data: user })
  }

  async invite({ request, response }: HttpContext) {
    const { email, role } = await request.validateUsing(inviteDirectoryUserValidator)
    const existing = await DirectoryUser.findBy('email', email)
    const authUser = await User.findBy('email', email)
    if (existing || authUser) {
      return response.conflict({ message: 'A user with this email already exists' })
    }

    const localPart = email.split('@')[0] || 'invited-user'
    const usernameBase = localPart.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    let username = usernameBase
    let suffix = 1
    while (await DirectoryUser.findBy('username', username)) {
      suffix += 1
      username = `${usernameBase}-${suffix}`
    }

    const user = await DirectoryUser.create({
      id: randomUUID(),
      firstName: localPart,
      lastName: 'Invited',
      username,
      email,
      phoneNumber: '',
      role,
      status: 'invited',
    })
    return response.created({ data: user })
  }

  async update({ request, params, response }: HttpContext) {
    const user = await DirectoryUser.find(params.id)
    if (!user) return response.notFound({ message: 'User not found' })

    const payload = await request.validateUsing(updateDirectoryUserValidator)
    const { password, ...profile } = payload
    const emailConflict = payload.email
      ? await DirectoryUser.query().where('email', payload.email).whereNot('id', user.id).first()
      : null
    const authEmailConflict = payload.email
      ? await User.query()
          .where('email', payload.email)
          .whereNot('id', user.authUserId ?? -1)
          .first()
      : null
    const usernameConflict = payload.username
      ? await DirectoryUser.query()
          .where('username', payload.username)
          .whereNot('id', user.id)
          .first()
      : null
    if (emailConflict || usernameConflict || authEmailConflict) {
      return response.conflict({ message: 'Email or username already exists' })
    }

    const email = profile.email ?? user.email
    const firstName = profile.firstName ?? user.firstName
    const lastName = profile.lastName ?? user.lastName
    let authUser = user.authUserId ? await User.find(user.authUserId) : null
    if (authUser) {
      authUser.merge({
        email,
        fullName: `${firstName} ${lastName}`,
        ...(password ? { password } : {}),
      })
      await authUser.save()
    } else if (password) {
      authUser = await User.create({
        fullName: `${firstName} ${lastName}`,
        email,
        password,
      })
      user.authUserId = authUser.id
    }

    user.merge(profile)
    await user.save()
    return { data: user }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = await DirectoryUser.find(params.id)
    if (!user) return response.notFound({ message: 'User not found' })

    if (user.authUserId === auth.getUserOrFail().id) {
      return response.forbidden({ message: 'You cannot delete your own account here' })
    }

    if (user.authUserId) await User.query().where('id', user.authUserId).delete()
    await user.delete()
    return response.noContent()
  }

  async bulkUpdate({ request }: HttpContext) {
    const { ids, status } = await request.validateUsing(bulkDirectoryUserValidator)
    if (ids.length && status) {
      await DirectoryUser.query().whereIn('id', ids).update({ status })
    }
    return { updated: ids.length }
  }

  async bulkDestroy({ auth, request, response }: HttpContext) {
    const { ids } = await request.validateUsing(bulkDirectoryUserValidator)
    if (!ids.length) return { deleted: 0 }

    const users = await DirectoryUser.query().whereIn('id', ids)
    const currentUserId = auth.getUserOrFail().id
    if (users.some((user) => user.authUserId === currentUserId)) {
      return response.forbidden({ message: 'You cannot delete your own account here' })
    }

    const authUserIds = users
      .map((user) => user.authUserId)
      .filter((id): id is number => id !== null)
    if (authUserIds.length) await User.query().whereIn('id', authUserIds).delete()
    await DirectoryUser.query().whereIn('id', ids).delete()
    return { deleted: ids.length }
  }
}
