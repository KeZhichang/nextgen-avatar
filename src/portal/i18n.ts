import i18next from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import zh from "./locales/zh.json"

const localePreferenceKey = "nextgen-avatar.locale"

export const localeLabels = {
  en: "English",
  zh: "简体中文",
} as const

export type Locale = keyof typeof localeLabels

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "zh"
}

export function readLocalePreference(): Locale {
  try {
    const saved = localStorage.getItem(localePreferenceKey)
    if (saved && isLocale(saved)) return saved
  } catch {
    // The URL still controls the language when storage is unavailable.
  }
  return "en"
}

export function setDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
  try {
    localStorage.setItem(localePreferenceKey, locale)
  } catch {
    // The route remains shareable without storing the preference.
  }
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  supportedLngs: ["en", "zh"],
  fallbackLng: "en",
  lng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})
