import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { fonts } from '@/config/fonts'
import { useTranslation } from 'react-i18next'
import { IconThemeSystem } from '@/assets/custom/icon-theme-system'
import { cn } from '@/lib/utils'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import {
  type ThemePreference,
  usePersistentTheme,
} from '@/hooks/use-persistent-theme'
import { useSaveSettings, useSettingsQuery } from '@/hooks/use-settings'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  font: z.enum(fonts),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

export function AppearanceForm() {
  const { t } = useTranslation()
  const settings = useSettingsQuery()
  const saveSettings = useSaveSettings()
  const { font, setFont } = useFont()
  const { theme, setTheme: applyTheme } = useTheme()
  const { theme: activeTheme, setTheme: persistTheme } = usePersistentTheme()
  const hasHydratedSettings = useRef(false)

  // This can come from your database or API.
  const defaultValues: Partial<AppearanceFormValues> = {
    theme: theme as ThemePreference,
    font,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })
  const reset = form.reset
  const setValue = form.setValue

  useEffect(() => {
    if (hasHydratedSettings.current) return
    const appearance = settings.data?.appearance
    if (!appearance) return
    const savedTheme = String(appearance.theme ?? theme)
    const savedFont = String(appearance.font ?? font)
    const validTheme: ThemePreference =
      savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
        ? savedTheme
        : theme
    const validFont = fonts.includes(savedFont as (typeof fonts)[number])
      ? (savedFont as (typeof fonts)[number])
      : font
    applyTheme(validTheme)
    setFont(validFont)
    reset({
      theme: validTheme,
      font: validFont,
    })
    hasHydratedSettings.current = true
  }, [applyTheme, font, reset, setFont, settings.data, theme])

  useEffect(() => {
    if (!hasHydratedSettings.current) return
    setValue('theme', activeTheme, { shouldDirty: false })
  }, [activeTheme, setValue])

  function onSubmit(data: AppearanceFormValues) {
    if (data.font === font) return
    setFont(data.font)
    saveSettings.mutate(
      { section: 'appearance', data: { font: data.font } },
      { onSuccess: () => form.resetField('font', { defaultValue: data.font }) }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Font')}</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-50 appearance-none font-normal capitalize',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute inset-e-3 top-2.5 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                {t('Set the font you want to use in the dashboard.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Theme')}</FormLabel>
              <FormDescription>
                {t('Select the theme for the dashboard.')}
              </FormDescription>
              <FormMessage />
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  const nextTheme = value as ThemePreference
                  field.onChange(nextTheme)
                  persistTheme(nextTheme)
                }}
                className='grid w-full max-w-md min-w-0 grid-cols-3 gap-4 pt-2'
              >
                <FormItem className='min-w-0'>
                  <FormLabel className='block min-w-0 [&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='system' className='sr-only' />
                    </FormControl>
                    <div className='flex h-[126px] w-full min-w-0 items-center justify-center overflow-hidden rounded-md border-2 border-muted bg-muted/40 p-3 hover:border-accent'>
                      <IconThemeSystem className='w-full max-w-full' />
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('System')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem className='min-w-0'>
                  <FormLabel className='block min-w-0 [&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='flex h-[126px] w-full min-w-0 items-center overflow-hidden rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <div className='w-full min-w-0 space-y-1 rounded-sm bg-[#ecedef] p-1.5'>
                        <div className='min-w-0 space-y-1 rounded-md bg-white p-1.5 shadow-xs'>
                          <div className='h-2 w-20 max-w-full rounded-lg bg-[#ecedef]' />
                          <div className='h-2 w-25 max-w-full rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex min-w-0 items-center space-x-2 rounded-md bg-white p-1.5 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-20 max-w-full rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex min-w-0 items-center space-x-2 rounded-md bg-white p-1.5 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-20 max-w-full rounded-lg bg-[#ecedef]' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('Light')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem className='min-w-0'>
                  <FormLabel className='block min-w-0 [&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='flex h-[126px] w-full min-w-0 items-center overflow-hidden rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground'>
                      <div className='w-full min-w-0 space-y-1 rounded-sm bg-slate-950 p-1.5'>
                        <div className='min-w-0 space-y-1 rounded-md bg-slate-800 p-1.5 shadow-xs'>
                          <div className='h-2 w-20 max-w-full rounded-lg bg-slate-400' />
                          <div className='h-2 w-25 max-w-full rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex min-w-0 items-center space-x-2 rounded-md bg-slate-800 p-1.5 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-20 max-w-full rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex min-w-0 items-center space-x-2 rounded-md bg-slate-800 p-1.5 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-20 max-w-full rounded-lg bg-slate-400' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('Dark')}
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={saveSettings.isPending || !form.formState.dirtyFields.font}
        >
          {t('Update preferences')}
        </Button>
      </form>
    </Form>
  )
}
