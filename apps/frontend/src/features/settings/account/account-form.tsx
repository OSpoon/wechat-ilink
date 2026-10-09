import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useSaveSettings, useSettingsQuery } from '@/hooks/use-settings'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type AccountFormValues = { name: string }

export function AccountForm() {
  const { t } = useTranslation()
  const accountFormSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, t('Name must be at least 2 characters.'))
          .max(30, t('Name must not be longer than 30 characters.')),
      }),
    [t]
  )
  const settings = useSettingsQuery()
  const saveSettings = useSaveSettings()
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: '' },
  })
  const reset = form.reset

  useEffect(() => {
    const account = settings.data?.account
    if (!account) return
    reset({ name: String(account.name ?? '') })
  }, [reset, settings.data])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          saveSettings.mutate({ section: 'account', data })
        )}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Display name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('Your name')} {...field} />
              </FormControl>
              <FormDescription>
                {t('This name appears in the console for your account.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={saveSettings.isPending}>
          {t('Save profile')}
        </Button>
      </form>
    </Form>
  )
}
