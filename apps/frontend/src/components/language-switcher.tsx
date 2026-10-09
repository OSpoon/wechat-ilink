import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage?.startsWith('zh')
    ? 'zh-CN'
    : 'en'

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={t('Change language')}
          title={t('Change language')}
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-40'>
        <DropdownMenuLabel>{t('Change language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void i18n.changeLanguage('en')}>
          {t('English')}
          {activeLanguage === 'en' && <Check className='ms-auto size-4' />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void i18n.changeLanguage('zh-CN')}>
          {t('Simplified Chinese')}
          {activeLanguage === 'zh-CN' && <Check className='ms-auto size-4' />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
