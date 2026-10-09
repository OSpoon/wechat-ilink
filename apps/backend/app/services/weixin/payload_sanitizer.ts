const sensitiveKeys = new Set([
  'authorization',
  'aes_key',
  'aeskey',
  'bot_token',
  'context_token',
  'encrypt_query_param',
  'full_url',
  'thumb_upload_param',
  'upload_full_url',
  'upload_param',
  'local_storage_key',
])

export function sanitizeProtocolPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeProtocolPayload)
  if (!value || typeof value !== 'object') return value

  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveKeys.has(key.toLowerCase())) continue
    result[key] = sanitizeProtocolPayload(child)
  }
  return result
}
