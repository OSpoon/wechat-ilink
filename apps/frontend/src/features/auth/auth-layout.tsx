import { useTranslation } from 'react-i18next'
import { Logo } from '@/assets/logo'
import { LanguageSwitcher } from '@/components/language-switcher'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className='relative container flex h-svh max-w-none items-center justify-center'>
      <div className='absolute end-4 top-4 z-10'>
        <LanguageSwitcher />
      </div>
      <div className='mx-auto flex w-full max-w-lg flex-col justify-center space-y-2 py-8 sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2' />
          <h1 className='text-xl font-medium'>{t('WeChat iLink')}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
