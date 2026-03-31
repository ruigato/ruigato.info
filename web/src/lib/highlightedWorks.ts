import highlightedSlugs from "../data/highlightedWorksSlugs.json"
import type { Work } from "../types/content"

/** Ordem da grelha «Highlighted» no site WordPress (the_grid name="Highlighted"). */
export const HIGHLIGHTED_WORK_SLUGS: readonly string[] = highlightedSlugs

export function filterHighlightedWorks(works: Work[]): Work[] {
  const bySlug = new Map(works.map((w) => [w.slug, w]))
  return HIGHLIGHTED_WORK_SLUGS.map((s) => bySlug.get(s)).filter(
    (w): w is Work => w !== undefined,
  )
}
