import type { Work } from "../types/content"
import type { CanonicalWork } from "./canonicalWorks"
import { hydrateCanonicalWork, hydrateCanonicalWorks } from "./canonicalWorks"

let cache: Work[] | null = null
let loadPromise: Promise<Work[]> | null = null
const detailCache = new Map<string, Work>()

const INDEX_URL = "/data/canonical/works-index.json"
const DETAILS_BASE_URL = "/data/canonical/works"

/** Nome da categoria por defeito do WordPress (não mostrar no site). */
export function isUncategorizedCategoryLabel(name: string): boolean {
  return name.trim().toLowerCase() === "uncategorized"
}

/**
 * Posts só com a categoria WordPress por defeito.
 * O ficheiro principal `works.json` já não os inclui (estão em
 * `worksArchivedUncategorized.json`); isto filtra re-importações acidentais.
 */
function workHasUncategorizedCategory(w: Work): boolean {
  return (w.categories ?? []).some((c) => isUncategorizedCategoryLabel(c))
}

export function excludeUncategorizedWorks(works: Work[]): Work[] {
  return works.filter((w) => !workHasUncategorizedCategory(w))
}

export async function loadWorks(): Promise<Work[]> {
  if (cache) {
    return cache
  }
  if (!loadPromise) {
    loadPromise = fetchCanonicalJson<CanonicalWork[]>(INDEX_URL)
      .then((data) => {
        const list = excludeUncategorizedWorks(
          hydrateCanonicalWorks(data),
        )
        cache = list
        return list
      })
  }
  return loadPromise
}

export async function loadWorkDetail(slug: string): Promise<Work> {
  const cachedDetail = detailCache.get(slug)
  if (cachedDetail) {
    return cachedDetail
  }

  const detail = hydrateCanonicalWork(
    await fetchCanonicalJson<CanonicalWork>(
      `${DETAILS_BASE_URL}/${encodeURIComponent(slug)}.json`,
    ),
  )

  detailCache.set(slug, detail)
  if (cache) {
    cache = cache.map((work) => (work.slug === slug ? { ...work, ...detail } : work))
  }
  return detail
}

export function findWorkBySlug(works: Work[], slug: string): Work | undefined {
  return works.find((w) => w.slug === slug)
}

async function fetchCanonicalJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load canonical works: ${response.status}`)
  }
  return (await response.json()) as T
}

/** Repõe caches em memória (ex.: após gravar uma ficha no servidor de desenvolvimento). */
export function invalidateWorkDataCaches(): void {
  cache = null
  loadPromise = null
  detailCache.clear()
}
