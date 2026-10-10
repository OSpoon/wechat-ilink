import vine from '@vinejs/vine'

export const createApiKeyValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  access: vine.enum(['read_only', 'read_write'] as const),
  expiresInDays: vine.enum([7, 30, 90, 365] as const),
})
