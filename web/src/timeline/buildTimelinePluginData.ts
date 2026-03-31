import type { TimelineEvent, Work } from "../types/content"
import type { TimelinePluginData } from "./timelinePluginTypes"
import { rewriteLegacyMediaUrl } from "../lib/legacyHtml"

function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/**
 * Converte obras + eventos exportados para o objecto `timelineData` do plugin WebGL.
 */
export function buildTimelinePluginData(
  works: Work[],
  events: TimelineEvent[],
): TimelinePluginData {
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
  const workBySlug = Object.fromEntries(works.map((w) => [w.slug, w]))
  const buckets: TimelinePluginData = {}
  const seenInCat = new Set<string>()

  for (const ev of events) {
    if (!ev.workSlug) continue
    const w = workBySlug[ev.workSlug]
    if (!w) continue

    const catLabel = w.categories?.[0] ?? "Obras"
    const catKey = slugifyCategory(catLabel) || "obras"
    const dedupe = `${catKey}::${ev.workSlug}`
    if (seenInCat.has(dedupe)) continue
    seenInCat.add(dedupe)

    if (!buckets[catKey]) {
      buckets[catKey] = { name: catLabel, posts: [] }
    }

    const fallbackDate = `${ev.year}-${String(ev.month ?? 6).padStart(2, "0")}-15`
    const rawDate = w.date?.slice(0, 10) ?? fallbackDate

    const thumb = w.featuredImage
      ? rewriteLegacyMediaUrl(w.featuredImage)
      : undefined

    buckets[catKey].posts.push({
      title: w.title,
      date: rawDate,
      link: `${origin}/works/${encodeURIComponent(w.slug)}`,
      thumbnail: thumb,
    })
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].posts.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }

  return buckets
}
