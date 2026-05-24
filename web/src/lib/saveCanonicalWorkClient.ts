const SAVE_URL = "/__api/save-canonical-work"

export async function fetchWorkCanonicalDraft(
  slug: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `/data/canonical/works/${encodeURIComponent(slug)}.json`,
    { cache: "no-store" },
  )
  if (!res.ok) {
    throw new Error(`Could not load draft: ${res.status}`)
  }
  return (await res.json()) as Record<string, unknown>
}

export type SaveCanonicalResult =
  | { ok: true }
  | { ok: false; error: string; status?: number }

export async function saveCanonicalWorkToDevServer(
  slug: string,
  secret: string,
  canonical: unknown,
): Promise<SaveCanonicalResult> {
  try {
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ secret, slug, canonical }),
    })
    const text = await res.text()
    let parsed: { ok?: boolean; error?: string } = {}
    try {
      parsed = JSON.parse(text) as typeof parsed
    } catch {
      if (!res.ok) {
        return { ok: false, error: text || res.statusText, status: res.status }
      }
    }
    if (res.ok && parsed.ok !== false) {
      return { ok: true }
    }
    return {
      ok: false,
      error: typeof parsed.error === "string" ? parsed.error : text,
      status: res.status,
    }
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export function downloadCanonicalJson(slug: string, canonical: unknown): void {
  const blob = new Blob([`${JSON.stringify(canonical, null, 2)}\n`], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slug}.json`
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
