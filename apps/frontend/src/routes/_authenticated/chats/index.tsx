import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ChatsRoute } from '@/features/chats'

const searchSchema = z.object({ accountId: z.string().optional() })

export const Route = createFileRoute('/_authenticated/chats/')({
  component: ChatsRoute,
  validateSearch: searchSchema,
})
