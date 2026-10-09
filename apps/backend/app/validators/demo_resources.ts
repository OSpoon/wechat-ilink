import vine from '@vinejs/vine'

const taskFields = () => ({
  title: vine.string().trim().minLength(1).maxLength(300),
  status: vine.enum(['todo', 'in progress', 'done', 'canceled', 'backlog'] as const),
  label: vine.enum(['bug', 'feature', 'documentation'] as const),
  priority: vine.enum(['low', 'medium', 'high'] as const),
})

export const createTaskValidator = vine.create(taskFields())
export const bulkCreateTaskValidator = vine.create({
  tasks: vine.array(vine.object(taskFields())),
})
export const updateTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(300).optional(),
  status: vine.enum(['todo', 'in progress', 'done', 'canceled', 'backlog'] as const).optional(),
  label: vine.enum(['bug', 'feature', 'documentation'] as const).optional(),
  priority: vine.enum(['low', 'medium', 'high'] as const).optional(),
})
export const bulkTaskUpdateValidator = vine.create({
  ids: vine.array(vine.string()),
  status: vine.enum(['todo', 'in progress', 'done', 'canceled', 'backlog'] as const).optional(),
  priority: vine.enum(['low', 'medium', 'high'] as const).optional(),
})

const directoryUserFields = () => ({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  username: vine.string().trim().minLength(1).maxLength(100),
  email: vine.string().trim().email().maxLength(254),
  phoneNumber: vine.string().trim().maxLength(50),
  role: vine.enum(['superadmin', 'admin', 'cashier', 'manager'] as const),
})

export const createDirectoryUserValidator = vine.create({
  ...directoryUserFields(),
  password: vine.string().minLength(8).maxLength(32),
})
export const updateDirectoryUserValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100).optional(),
  lastName: vine.string().trim().minLength(1).maxLength(100).optional(),
  username: vine.string().trim().minLength(1).maxLength(100).optional(),
  email: vine.string().trim().email().maxLength(254).optional(),
  phoneNumber: vine.string().trim().maxLength(50).optional(),
  role: vine.enum(['superadmin', 'admin', 'cashier', 'manager'] as const).optional(),
  status: vine.enum(['active', 'inactive', 'invited', 'suspended'] as const).optional(),
  password: vine.string().minLength(8).maxLength(32).optional(),
})
export const inviteDirectoryUserValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
  role: vine.enum(['superadmin', 'admin', 'cashier', 'manager'] as const),
  desc: vine.string().trim().maxLength(1000).optional(),
})
export const bulkDirectoryUserValidator = vine.create({
  ids: vine.array(vine.string()),
  status: vine.enum(['active', 'inactive', 'invited'] as const).optional(),
})
