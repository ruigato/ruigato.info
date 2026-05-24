import { useContext } from "react"
import { WorkEditorAuthContext } from "../context/workEditorAuthContext"

export function useWorkEditorAuth() {
  const ctx = useContext(WorkEditorAuthContext)
  if (!ctx) {
    throw new Error("useWorkEditorAuth must be used within WorkEditorAuthProvider")
  }
  return ctx
}
