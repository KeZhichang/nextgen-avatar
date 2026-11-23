import i18next from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import zh from "./locales/zh.json"

export const defaultLocale = "en" as const

export const localeLabels = {
  en: "English",
  zh: "简体中文",
} as const

export type Locale = keyof typeof localeLabels

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "zh"
}

export function setDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
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
