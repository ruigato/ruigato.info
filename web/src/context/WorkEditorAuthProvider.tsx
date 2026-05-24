import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  WorkEditorAuthContext,
  type WorkEditorAuthContextValue,
} from "./workEditorAuthContext"

const STORAGE_KEY = "ruigato.work-editor-secret"

function readStoredSecret(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function initialCredential(expected: string): string {
  const stored = readStoredSecret()
  return stored === expected ? stored : ""
}

export function WorkEditorAuthProvider({ children }: { children: ReactNode }) {
  const expected = import.meta.env.VITE_WORK_EDITOR_SECRET?.trim() ?? ""
  const editorConfigured = expected.length > 0
  const [credential, setCredential] = useState<string>(() =>
    initialCredential(expected),
  )

  const isUnlocked = editorConfigured && credential === expected
  const editorSecret = isUnlocked ? credential : ""

  const unlock = useCallback(
    (password: string): boolean => {
      if (!editorConfigured) return false
      if (password !== expected) return false
      try {
        window.sessionStorage.setItem(STORAGE_KEY, password)
      } catch {
        /* ignore */
      }
      setCredential(password)
      return true
    },
    [editorConfigured, expected],
  )

  const lock = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setCredential("")
  }, [])

  const value = useMemo(
    (): WorkEditorAuthContextValue => ({
      editorConfigured,
      isUnlocked,
      editorSecret,
      unlock,
      lock,
    }),
    [editorConfigured, isUnlocked, editorSecret, unlock, lock],
  )

  return (
    <WorkEditorAuthContext.Provider value={value}>
      {children}
    </WorkEditorAuthContext.Provider>
  )
}
