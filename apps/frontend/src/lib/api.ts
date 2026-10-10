import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import type {
  ApiUser,
  WeixinAccount,
  WeixinLoginSession,
  WeixinMessage,
  WeixinWebhook,
  WeixinWebhookDelivery,
} from '@/lib/api-types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
})

api.interceptors.request.use(async (config) => {
  const { auth } = useAuthStore.getState()
  const token = auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  else delete config.headers.Authorization
  return config
})

type AuthResponse = {
  user: ApiUser
  token: string
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.post<unknown>(path, body)
  return unwrap<T>(response.data)
}

async function get<T>(path: string): Promise<T> {
  const response = await api.get<unknown>(path)
  return unwrap<T>(response.data)
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await api.patch<unknown>(path, body)
  return unwrap<T>(response.data)
}

export const authApi = {
  async login(credentials: { email: string; password: string }) {
    return post<AuthResponse>('/auth/login', credentials)
  },

  async signUp(credentials: {
    fullName: string
    email: string
    password: string
    passwordConfirmation: string
  }) {
    return post<AuthResponse>('/auth/signup', credentials)
  },

  async profile() {
    const response = await api.get<unknown>('/account/profile')
    return unwrap<ApiUser>(response.data)
  },

  async logout() {
    return post<{ message: string }>('/account/logout')
  },
}

export type SettingsData = Record<string, Record<string, unknown>>

export type ApiKeyAccess = 'read_only' | 'read_write'

export type ApiKey = {
  id: number
  name: string
  abilities: string[]
  createdAt: string | null
  expiresAt: string | null
  lastUsedAt: string | null
}

export type CreatedApiKey = ApiKey & { token: string }

export const settingsApi = {
  get: () => get<SettingsData>('/account/settings'),
  update: (section: string, data: Record<string, unknown>) =>
    patch<SettingsData>(`/account/settings/${section}`, data),
}

export const apiKeysApi = {
  list: () => get<ApiKey[]>('/account/api-keys'),
  create: (payload: {
    name: string
    access: ApiKeyAccess
    expiresInDays: 7 | 30 | 90 | 365
  }) => post<CreatedApiKey>('/account/api-keys', payload),
  revoke: (keyId: number) => api.delete(`/account/api-keys/${keyId}`),
}

export const weixinApi = {
  accounts: {
    list: () => get<WeixinAccount[]>('/weixin/accounts'),
    get: (accountId: string) =>
      get<WeixinAccount>(`/weixin/accounts/${accountId}`),
    start: (accountId: string) =>
      post<WeixinAccount>(`/weixin/accounts/${accountId}/start`),
    stop: (accountId: string) =>
      post<WeixinAccount>(`/weixin/accounts/${accountId}/stop`),
    remove: (accountId: string) => api.delete(`/weixin/accounts/${accountId}`),
  },
  login: {
    create: () => post<WeixinLoginSession>('/weixin/login-sessions'),
    get: (sessionId: string) =>
      get<WeixinLoginSession>(`/weixin/login-sessions/${sessionId}`),
    verify: (sessionId: string, code: string) =>
      post<WeixinLoginSession>(`/weixin/login-sessions/${sessionId}/verify`, {
        code,
      }),
    cancel: (sessionId: string) =>
      api.delete(`/weixin/login-sessions/${sessionId}`),
  },
  messages: {
    list: (accountId: string, limit = 100) =>
      get<WeixinMessage[]>(
        `/weixin/accounts/${accountId}/messages?limit=${limit}`
      ),
    sendText: (accountId: string, to: string, text: string) =>
      post<{ id: string; clientMessageId: string; status: string }>(
        `/weixin/accounts/${accountId}/messages`,
        { to, text }
      ),
    sendMedia: async (
      accountId: string,
      payload: {
        to: string
        mediaType: 'image' | 'video' | 'file'
        caption?: string
        file: File
      }
    ) => {
      const body = new FormData()
      body.append('to', payload.to)
      body.append('mediaType', payload.mediaType)
      if (payload.caption) body.append('caption', payload.caption)
      body.append('file', payload.file)
      const response = await api.post<unknown>(
        `/weixin/accounts/${accountId}/messages/media`,
        body
      )
      return unwrap<{
        id: string
        clientMessageId: string
        mediaType: string
        status: string
      }>(response.data)
    },
    typing: (accountId: string, to: string, status: 1 | 2) =>
      post<{ status: number }>(`/weixin/accounts/${accountId}/typing`, {
        to,
        status,
      }),
    downloadMedia: async (
      accountId: string,
      messageId: string,
      itemIndex: number
    ) => {
      const response = await api.get<Blob>(
        `/weixin/accounts/${accountId}/messages/${messageId}/media/${itemIndex}`,
        { responseType: 'blob' }
      )
      return response.data
    },
  },
  webhooks: {
    list: () => get<WeixinWebhook[]>('/weixin/webhooks'),
    create: (payload: {
      accountId: string
      url: string
      secret: string
      events: string[]
    }) => post<WeixinWebhook>('/weixin/webhooks', payload),
    remove: (webhookId: string) => api.delete(`/weixin/webhooks/${webhookId}`),
    deliveries: (webhookId: string) =>
      get<WeixinWebhookDelivery[]>(`/weixin/webhooks/${webhookId}/deliveries`),
  },
}
