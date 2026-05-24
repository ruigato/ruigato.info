/**
 * Removes WordPress `[embed]…[/embed]` tail accidentally pasted into migrated URLs
 * (e.g. `https://youtube.com/watch?v=…[/embed` breaks `new URL()`).
 */
export function sanitizeWorkMediaExternalUrl(
  s: string | null | undefined,
): string | null {
  if (s == null) return null
  const t = String(s).trim()
  if (t === "") return null
  const cut = t.indexOf("[")
  const base = cut >= 0 ? t.slice(0, cut) : t
  const out = base.trim()
  return out === "" ? null : out
}
