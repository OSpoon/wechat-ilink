import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import zhCN from './locales/zh-CN'

const normalizeLanguage = (language: string) =>
  language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN'],
    keySeparator: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wechat-ilink-language',
      caches: ['localStorage'],
      convertDetectedLanguage: normalizeLanguage,
    },
    react: { useSuspense: false },
  })
  .then(() => {
    document.documentElement.lang = normalizeLanguage(
      i18n.resolvedLanguage ?? 'en'
    )
  })

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = normalizeLanguage(language)
})

export default i18n
