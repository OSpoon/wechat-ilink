import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const formSchema = useMemo(
    () =>
      z
        .object({
          fullName: z
            .string()
            .trim()
            .min(1, t('Please enter your name.'))
            .max(255, t('Name must not be longer than 255 characters.')),
          email: z.email({
            error: (issue) =>
              issue.input === ''
                ? t('Please enter your email.')
                : t('Please enter a valid email address.'),
          }),
          password: z
            .string()
            .min(1, t('Please enter your password.'))
            .min(8, t('Password must be at least 8 characters long.'))
            .max(32, t('Password must be at most 32 characters long.')),
          confirmPassword: z
            .string()
            .min(1, t('Please confirm your password.')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("Passwords don't match."),
          path: ['confirmPassword'],
        }),
    [t]
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const result = await authApi.signUp({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        passwordConfirmation: data.confirmPassword,
      })
      auth.setUser(result.user)
      auth.setAccessToken(result.token)
      navigate({ to: '/', replace: true })
    } catch (error) {
      handleServerError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='fullName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Full name')}</FormLabel>
              <FormControl>
                <Input
                  autoComplete='name'
                  placeholder={t('e.g. Jane Doe')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Email')}</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Confirm Password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
          {t('Create Account')}
        </Button>
      </form>
    </Form>
  )
}
