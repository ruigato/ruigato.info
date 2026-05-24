import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { LocaleCode } from "../types/content"

type SiteLocaleContextValue = {
  locale: LocaleCode
  setLocale: (locale: LocaleCode) => void
}

const STORAGE_KEY = "ruigato.site-locale"

const SiteLocaleContext = createContext<SiteLocaleContextValue | null>(null)

function readInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return "en"
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === "pt" || saved === "en" ? saved : "en"
}

export function SiteLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>(readInitialLocale)

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale === "pt" ? "pt-PT" : "en"
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale }), [locale])

  return (
    <SiteLocaleContext.Provider value={value}>
      {children}
    </SiteLocaleContext.Provider>
  )
}

export function useSiteLocale(): SiteLocaleContextValue {
  const ctx = useContext(SiteLocaleContext)
  if (!ctx) {
    throw new Error("useSiteLocale must be used within SiteLocaleProvider")
  }
  return ctx
}
