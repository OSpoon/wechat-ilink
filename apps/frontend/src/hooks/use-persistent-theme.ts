import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { settingsApi, type SettingsData } from '@/lib/api'
import { useTheme } from '@/context/theme-provider'
import { settingsQueryKey } from './use-settings'

export type ThemePreference = 'light' | 'dark' | 'system'
type ThemeMutationInput = {
  theme: ThemePreference
  previousTheme: ThemePreference
}

export function usePersistentTheme() {
  const queryClient = useQueryClient()
  const {
    theme,
    defaultTheme,
    setTheme: applyTheme,
    resetTheme: resetLocalTheme,
  } = useTheme()
  const isAuthenticated = useAuthStore((state) =>
    Boolean(state.auth.accessToken)
  )
  const themeRef = useRef<ThemePreference>(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  const updateTheme = useMutation({
    mutationKey: ['settings', 'appearance', 'theme'],
    scope: { id: 'account-settings' },
    mutationFn: ({ theme: nextTheme }: ThemeMutationInput) =>
      settingsApi.update('appearance', { theme: nextTheme }),
    onMutate: async ({ theme: nextTheme }) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey })
      const previousSettings =
        queryClient.getQueryData<SettingsData>(settingsQueryKey)
      queryClient.setQueryData<SettingsData>(settingsQueryKey, (current) => ({
        ...current,
        appearance: { ...current?.appearance, theme: nextTheme },
      }))
      return { previousSettings }
    },
    onError: (_error, variables, context) => {
      const currentTheme =
        queryClient.getQueryData<SettingsData>(settingsQueryKey)?.appearance
          ?.theme

      if (currentTheme === variables.theme) {
        themeRef.current = variables.previousTheme
        applyTheme(variables.previousTheme)

        if (context?.previousSettings) {
          queryClient.setQueryData(settingsQueryKey, context.previousSettings)
        } else {
          queryClient.removeQueries({ queryKey: settingsQueryKey })
        }
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<SettingsData>(settingsQueryKey, (current) => ({
        ...settings,
        appearance: {
          ...settings.appearance,
          ...current?.appearance,
        },
      }))
    },
  })

  function setPersistentTheme(nextTheme: ThemePreference) {
    const previousTheme = themeRef.current
    themeRef.current = nextTheme
    applyTheme(nextTheme)

    if (isAuthenticated) {
      updateTheme.mutate({ theme: nextTheme, previousTheme })
    }
  }

  function resetPersistentTheme() {
    const previousTheme = themeRef.current
    const nextTheme = defaultTheme as ThemePreference
    themeRef.current = nextTheme
    resetLocalTheme()

    if (isAuthenticated) {
      updateTheme.mutate({ theme: nextTheme, previousTheme })
    }
  }

  return {
    theme,
    setTheme: setPersistentTheme,
    resetTheme: resetPersistentTheme,
    isSaving: updateTheme.isPending,
  }
}
