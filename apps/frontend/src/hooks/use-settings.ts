import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { settingsApi } from '@/lib/api'

export const settingsQueryKey = ['account-settings']

export function useSettingsQuery() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: settingsApi.get })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      section,
      data,
    }: {
      section: string
      data: Record<string, unknown>
    }) => settingsApi.update(section, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey })
      toast.success('Settings saved.')
    },
  })
}
