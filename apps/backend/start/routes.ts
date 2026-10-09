/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

router.get('/', () => ({ hello: 'world' }))
router.get('/health', () => ({ status: 'ok' }))

router
  .group(() => {
    router.post('signup', [controllers.NewAccount, 'store'])
    router.post('login', [controllers.AccessTokens, 'store'])
  })
  .prefix('/api/v1/auth')

router
  .group(() => {
    router.get('profile', [controllers.Profile, 'show'])
    router.post('logout', [controllers.AccessTokens, 'destroy'])
    router.get('settings', [controllers.Settings, 'show'])
    router.patch('settings/:section', [controllers.Settings, 'update'])
  })
  .prefix('/api/v1/account')
  .use(middleware.auth({ guards: ['api', 'clerk'] }))

router
  .group(() => {
    router.get('tasks', [controllers.Tasks, 'index'])
    router.post('tasks', [controllers.Tasks, 'store'])
    router.post('tasks/bulk', [controllers.Tasks, 'bulkStore'])
    router.patch('tasks/bulk', [controllers.Tasks, 'bulkUpdate'])
    router.post('tasks/bulk-delete', [controllers.Tasks, 'bulkDestroy'])
    router.patch('tasks/:id', [controllers.Tasks, 'update'])
    router.delete('tasks/:id', [controllers.Tasks, 'destroy'])

    router.get('directory-users', [controllers.DirectoryUsers, 'index'])
    router.post('directory-users', [controllers.DirectoryUsers, 'store'])
    router.post('directory-users/invitations', [controllers.DirectoryUsers, 'invite'])
    router.patch('directory-users/bulk', [controllers.DirectoryUsers, 'bulkUpdate'])
    router.post('directory-users/bulk-delete', [controllers.DirectoryUsers, 'bulkDestroy'])
    router.patch('directory-users/:id', [controllers.DirectoryUsers, 'update'])
    router.delete('directory-users/:id', [controllers.DirectoryUsers, 'destroy'])

    router.get('integrations', [controllers.Integrations, 'index'])
    router.patch('integrations/:name', [controllers.Integrations, 'update'])

    router.get('chats', [controllers.Chats, 'index'])
    router.post('chats', [controllers.Chats, 'store'])
    router.post('chats/:id/messages', [controllers.Chats, 'storeMessage'])

    router.get('dashboard', [controllers.Dashboard, 'show'])
  })
  .prefix('/api/v1')
  .use(middleware.auth({ guards: ['api', 'clerk'] }))
