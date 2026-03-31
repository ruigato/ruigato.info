import { useEffect, useState } from "react"
import { loadWorks } from "../lib/works"
import type { Work } from "../types/content"

export function useWorks(): {
  works: Work[] | null
  error: Error | null
  loading: boolean
} {
  const [works, setWorks] = useState<Work[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    loadWorks()
      .then((w) => {
        if (active) {
          setWorks(w)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(e instanceof Error ? e : new Error(String(e)))
        }
      })
    return () => {
      active = false
    }
  }, [])

  return {
    works,
    error,
    loading: works === null && error === null,
  }
}
