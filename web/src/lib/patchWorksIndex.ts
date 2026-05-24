import type { CanonicalWork } from "./canonicalWorks"

type IndexEntry = Record<string, unknown>

/**
 * Campos do `works-index.json` que devem reflectir a ficha completa ao gravar.
 */
export function buildIndexEntryPatch(
  canonical: CanonicalWork & { id?: string },
): IndexEntry {
  const entry: IndexEntry = {
    slug: canonical.slug,
    title: canonical.title,
    summary: canonical.summary ?? null,
    published_at: canonical.published_at ?? null,
    occurred_on: canonical.occurred_on ?? null,
    event_name: canonical.event_name ?? null,
    legacy_wp_id: canonical.legacy_wp_id ?? null,
    primary_category: canonical.primary_category ?? null,
    categories: canonical.categories ?? [],
    tags: canonical.tags ?? [],
    venue: canonical.venue ?? null,
    client: canonical.client ?? null,
    umbrella_entity: canonical.umbrella_entity ?? null,
    umbrella_entity_confidence: canonical.umbrella_entity_confidence ?? null,
    iteration_of_work_id: canonical.iteration_of_work_id ?? null,
    featured_media: canonical.featured_media ?? null,
    review_flags: canonical.review_flags ?? [],
  }
  if (canonical.id != null && String(canonical.id).length > 0) {
    entry.id = String(canonical.id)
  } else if (canonical.legacy_wp_id != null) {
    entry.id = String(canonical.legacy_wp_id)
  }
  return entry
}

/**
 * Funde o patch no item do índice, preservando `id` antigo se o patch não trouxer um válido.
 */
export function mergeIndexEntry(
  previous: IndexEntry,
  patch: IndexEntry,
): IndexEntry {
  return { ...previous, ...patch }
}
