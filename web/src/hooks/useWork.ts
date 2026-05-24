import { useEffect, useState } from "react"
import type { Work } from "../types/content"
import { loadWorkDetail } from "../lib/works"

export function useWork(
  slug: string | undefined,
  reloadToken = 0,
): {
  work: Work | null
  error: Error | null
  loading: boolean
} {
  const [work, setWork] = useState<Work | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!slug) {
      setWork(null)
      setError(null)
      return
    }
    let active = true
    setWork(null)
    setError(null)
    loadWorkDetail(slug)
      .then((next) => {
        if (!active) return
        setWork(next)
      })
      .catch((e: unknown) => {
        if (!active) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      active = false
    }
  }, [slug, reloadToken])

  return {
    work,
    error,
    loading: slug !== undefined && work === null && error === null,
  }
}
