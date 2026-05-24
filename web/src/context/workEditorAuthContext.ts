import { createContext } from "react"

export type WorkEditorAuthContextValue = {
  /** True when `VITE_WORK_EDITOR_SECRET` is defined in the build. */
  editorConfigured: boolean
  isUnlocked: boolean
  /** Presente quando desbloqueado; usado para gravar via API em desenvolvimento. */
  editorSecret: string
  unlock: (password: string) => boolean
  lock: () => void
}

export const WorkEditorAuthContext =
  createContext<WorkEditorAuthContextValue | null>(null)
