type JsonObject = Record<string, unknown>

const OPENAPI_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head'])

const tagDescriptions: Record<string, string> = {
  系统: '服务存活、就绪和基础信息。',
  AUTH: '用户注册、登录和访问令牌管理。',
  ACCOUNT: '当前 API 用户信息和访问令牌管理。',
  WEIXIN: '微信账号接入和 iLink 协议操作。',
  用户认证: '用户注册、登录和访问令牌管理。',
  账号管理: '当前 API 用户信息和访问令牌管理。',
  微信接入: '微信二维码登录和账号接入。',
  微信账号: '微信账号列表、状态和 Worker 管理。',
  微信消息: '微信消息收发、媒体和输入状态。',
  Webhook: '入站消息 Webhook 配置和投递记录。',
  消息回调: '入站消息 Webhook 配置和投递记录。',
}

const routeDescriptions: Record<string, { summary: string; description: string }> = {
  '/': { summary: '服务根信息', description: '返回 API 服务的基础信息。' },
  '/health/live': { summary: '存活检查', description: '检查 API 进程是否正在运行。' },
  '/health/ready': {
    summary: '就绪检查',
    description: '检查 API 服务及 SQLite 数据库是否已就绪。',
  },
}

const componentResponseDescriptions: Record<string, string> = {
  Forbidden: '认证失败：访问令牌缺失或无效。',
  Accepted: '请求已受理。',
  Created: '资源创建成功。',
  NotFound: '请求的资源不存在。',
  NotAcceptable: '请求不可接受。',
}

const statusResponseDescriptions: Record<string, string> = {
  '200': '请求成功。',
  '201': '资源创建成功。',
  '202': '请求已受理。',
  '204': '操作成功，无返回内容。',
  '401': '未授权：访问令牌缺失或无效。',
  '403': '禁止访问。',
  '404': '请求的资源不存在。',
  '409': '请求产生冲突。',
  '422': '请求参数校验失败。',
}

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as JsonObject
}

function localizeSummary(summary: string) {
  return summary.replace(/\s+\((?:index|show|store|start|stop|verify|destroy|deliveries)\)$/u, '')
}

function stripGeneratedSource(description: string) {
  return description.replace(/\n\n _[^\n]+_ - \*\*[^*]+\*\*$/u, '').trim()
}

function isGeneratedResponseDescription(description: string) {
  return (
    description === 'OK' ||
    description === 'Created' ||
    description === 'Accepted' ||
    description.startsWith('Returns **') ||
    description.startsWith('The request ') ||
    description.startsWith('The resource ')
  )
}

function localizeResponses(value: unknown, useStatusDescription: boolean) {
  const responses = asObject(value)
  if (!responses) return

  for (const [key, rawResponse] of Object.entries(responses)) {
    const response = asObject(rawResponse)
    if (!response) continue
    if ((key === '204' || key === '304') && 'content' in response) delete response.content
    const description = response.description
    if (
      typeof description === 'string' &&
      ((useStatusDescription && isGeneratedResponseDescription(description)) ||
        (!useStatusDescription && componentResponseDescriptions[key]))
    ) {
      response.description = useStatusDescription
        ? statusResponseDescriptions[key] || '请求处理失败。'
        : componentResponseDescriptions[key]
    }
  }
}

/**
 * Converts generated reader-facing OpenAPI text to Chinese while
 * leaving paths, schema properties and machine-oriented operation IDs intact.
 */
export function localizeOpenApiDocument(document: unknown) {
  const root = asObject(document)
  if (!root) return document

  const tags = root.tags
  if (Array.isArray(tags)) {
    const uniqueTags = new Map<string, JsonObject>()
    for (const rawTag of tags) {
      const tag = asObject(rawTag)
      if (!tag || typeof tag.name !== 'string') continue
      tag.description = tagDescriptions[tag.name] || `接口分组：${tag.name}`
      uniqueTags.set(tag.name, tag)
    }
    root.tags = [...uniqueTags.values()]
  }

  const components = asObject(root.components)
  if (components) localizeResponses(components.responses, false)

  const paths = asObject(root.paths)
  if (!paths) return document

  for (const [path, rawPathItem] of Object.entries(paths)) {
    const pathItem = asObject(rawPathItem)
    if (!pathItem) continue
    const routeDescription = routeDescriptions[path]

    for (const [method, rawOperation] of Object.entries(pathItem)) {
      if (!OPENAPI_METHODS.has(method)) continue
      const operation = asObject(rawOperation)
      if (!operation) continue

      if (routeDescription) {
        operation.summary = routeDescription.summary
        operation.description = routeDescription.description
      } else {
        if (typeof operation.summary === 'string') {
          operation.summary = localizeSummary(operation.summary)
        }
        if (typeof operation.description === 'string') {
          operation.description = stripGeneratedSource(operation.description)
        }
      }

      localizeResponses(operation.responses, true)
    }
  }

  return document
}
