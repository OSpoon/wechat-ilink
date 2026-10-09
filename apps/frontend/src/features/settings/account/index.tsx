import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const { t } = useTranslation()
  return (
    <ContentSection
      title={t('Profile')}
      desc={t('Update the display name associated with your account.')}
    >
      <AccountForm />
    </ContentSection>
  )
}
