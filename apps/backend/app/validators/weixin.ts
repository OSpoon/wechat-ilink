import vine from '@vinejs/vine'
import { mediaTypes } from '#services/weixin/media_service'
import { webhookEvents } from '#services/weixin/webhook_service'

export const verifyCodeValidator = vine.create({
  code: vine
    .string()
    .trim()
    .regex(/^\d{1,8}$/),
})

export const sendTextMessageValidator = vine.create({
  to: vine.string().trim().minLength(1).maxLength(255),
  text: vine.string().maxLength(4000),
  contextToken: vine.string().trim().maxLength(4096).optional(),
  clientMessageId: vine.string().trim().maxLength(255).optional(),
  runId: vine.string().trim().maxLength(255).optional(),
})

export const sendMediaMessageValidator = vine.create({
  to: vine.string().trim().minLength(1).maxLength(255),
  mediaType: vine.enum(mediaTypes),
  caption: vine.string().maxLength(4000).optional(),
  contextToken: vine.string().trim().maxLength(4096).optional(),
  clientMessageId: vine.string().trim().maxLength(255).optional(),
  runId: vine.string().trim().maxLength(255).optional(),
})

export const typingValidator = vine.create({
  to: vine.string().trim().minLength(1).maxLength(255),
  status: vine.number().in([1, 2]),
  contextToken: vine.string().trim().maxLength(4096).optional(),
})

export const createWebhookValidator = vine.create({
  accountId: vine.string().trim().minLength(1).maxLength(80),
  url: vine.string().trim().minLength(1).maxLength(2048),
  secret: vine.string().trim().minLength(16).maxLength(255),
  events: vine.array(vine.enum(webhookEvents)).minLength(1).maxLength(10),
})
