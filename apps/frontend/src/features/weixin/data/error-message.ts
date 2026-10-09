import i18n from '@/i18n'

export function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response
    const data = response?.data
    if (data && typeof data === 'object') {
      const body = data as {
        error?: { message?: unknown }
        message?: unknown
      }
      if (typeof body.error?.message === 'string')
        return i18n.t(body.error.message)
      if (typeof body.message === 'string') return i18n.t(body.message)
    }
  }
  return error instanceof Error ? i18n.t(error.message) : fallback
}
