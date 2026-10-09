import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/accounts/$accountId')({
  component: () => <Navigate to='/accounts' replace />,
})
