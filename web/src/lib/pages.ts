import type { SitePage } from "../types/content"

let cache: SitePage[] | null = null
let loadPromise: Promise<SitePage[]> | null = null

export async function loadPages(): Promise<SitePage[]> {
  if (cache) {
    return cache
  }
  if (!loadPromise) {
    loadPromise = import("../data/pages.json").then((m) => {
      const { pages } = m.default as { pages: SitePage[] }
      cache = pages
      return cache
    })
  }
  return loadPromise
}
