import type { Work } from "../types/content"

let cache: Work[] | null = null
let loadPromise: Promise<Work[]> | null = null

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
    loadPromise = import("../data/works.json").then((m) => {
      const list = excludeUncategorizedWorks(m.default as Work[])
      cache = list
      return list
    })
  }
  return loadPromise
}

export function findWorkBySlug(works: Work[], slug: string): Work | undefined {
  return works.find((w) => w.slug === slug)
}
