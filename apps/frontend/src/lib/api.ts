import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiUser } from '@/lib/api-types'
import { requestClerkToken } from '@/lib/clerk-session'
import type { ChatUser } from '@/features/chats/data/chat-types'
import type { Task } from '@/features/tasks/data/schema'
import type { User } from '@/features/users/data/schema'

export type IntegrationRecord = {
  name: string
  description: string
  connected: boolean
}

export type DashboardData = {
  overview: {
    revenue: string
    revenueChange: string
    subscriptions: string
    subscriptionsChange: string
    sales: string
    salesChange: string
    activeNow: string
    activeNowChange: string
    salesThisMonth: number
    monthlyRevenue: { name: string; total: number }[]
    recentSales: {
      name: string
      email: string
      avatar: string
      initials: string
      amount: number
    }[]
  }
  analytics: {
    traffic: { name: string; clicks: number; uniques: number }[]
    stats: { label: string; value: string; change: string }[]
    referrers: { name: string; value: number }[]
    devices: { name: string; value: number }[]
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
})

api.interceptors.request.use(async (config) => {
  const { auth } = useAuthStore.getState()
  const token =
    auth.provider === 'clerk' ? await requestClerkToken() : auth.accessToken
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

type TaskInput = Pick<Task, 'title' | 'status' | 'label' | 'priority'>
type DirectoryUserInput = Pick<
  User,
  'firstName' | 'lastName' | 'username' | 'email' | 'phoneNumber' | 'role'
>
type DirectoryUserCreateInput = DirectoryUserInput & { password: string }
type DirectoryUserUpdateInput = Partial<DirectoryUserInput> & {
  password?: string
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

export const tasksApi = {
  list: () => get<Task[]>('/tasks'),
  create: (task: TaskInput) => post<Task>('/tasks', task),
  bulkCreate: (tasks: TaskInput[]) => post<Task[]>('/tasks/bulk', { tasks }),
  update: (id: string, task: TaskInput) => patch<Task>(`/tasks/${id}`, task),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  bulkUpdate: (
    ids: string[],
    changes: { status?: string; priority?: string }
  ) => patch<{ updated: number }>('/tasks/bulk', { ids, ...changes }),
  bulkDelete: (ids: string[]) =>
    post<{ deleted: number }>('/tasks/bulk-delete', { ids }),
}

export const directoryUsersApi = {
  list: () => get<User[]>('/directory-users'),
  create: (user: DirectoryUserCreateInput) =>
    post<User>('/directory-users', user),
  invite: (invitation: { email: string; role: string; desc?: string }) =>
    post<User>('/directory-users/invitations', invitation),
  update: (id: string, user: DirectoryUserUpdateInput) =>
    patch<User>(`/directory-users/${id}`, user),
  remove: (id: string) => api.delete(`/directory-users/${id}`),
  bulkUpdate: (ids: string[], status: 'active' | 'inactive' | 'invited') =>
    patch<{ updated: number }>('/directory-users/bulk', { ids, status }),
  bulkDelete: (ids: string[]) =>
    post<{ deleted: number }>('/directory-users/bulk-delete', { ids }),
}

export const integrationsApi = {
  list: () => get<IntegrationRecord[]>('/integrations'),
  setConnected: (name: string, connected: boolean) =>
    patch<IntegrationRecord>(`/integrations/${encodeURIComponent(name)}`, {
      connected,
    }),
}

export const chatsApi = {
  list: () => get<ChatUser[]>('/chats'),
  create: (participants: Omit<ChatUser, 'messages'>[]) =>
    post<ChatUser>('/chats', { participants }),
  sendMessage: (id: string, message: string) =>
    post<ChatUser>(`/chats/${id}/messages`, { message }),
}

export const dashboardApi = {
  get: () => get<DashboardData>('/dashboard'),
}

export type SettingsData = Record<string, Record<string, unknown>>

export const settingsApi = {
  get: () => get<SettingsData>('/account/settings'),
  update: (section: string, data: Record<string, unknown>) =>
    patch<SettingsData>(`/account/settings/${section}`, data),
}
