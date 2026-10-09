import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  render as browserRender,
  type RenderResult,
} from 'vitest-browser-react'

export type { RenderResult }

export function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return browserRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}
