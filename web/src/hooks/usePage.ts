import { useEffect, useState } from "react"
import { loadPages } from "../lib/pages"
import type { SitePage } from "../types/content"

/**
 * Carrega uma página do export por slug.
 * Quando o slug pode mudar no mesmo sítio, envolve o componente com `key={slug}` para repor o estado.
 */
export function usePage(slug: string | undefined): {
  page: SitePage | null
  error: Error | null
  loading: boolean
} {
  const key = slug?.trim() ?? ""
  const [page, setPage] = useState<SitePage | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(() => Boolean(key))

  useEffect(() => {
    if (!key) {
      return
    }

    let active = true

    loadPages()
      .then((pages) => {
        if (!active) return
        setPage(pages.find((p) => p.slug === key) ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!active) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [key])

  if (!key) {
    return { page: null, error: null, loading: false }
  }

  return { page, error, loading }
}
