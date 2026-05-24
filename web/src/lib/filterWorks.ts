import type { Work } from "../types/content"
import { isUncategorizedCategoryLabel } from "./works"

export type WorksSortMode = "date-desc" | "date-asc" | "title-asc"

export type WorksFilterState = {
  search: string
  category: string
  tag: string
  sort: WorksSortMode
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function workHaystack(w: Work): string {
  const parts = [
    w.title,
    w.summary ?? "",
    w.normalizedSummary?.en ?? "",
    w.normalizedSummary?.pt ?? "",
    ...(w.textBlocks?.map((b) => b.content) ?? []),
    ...(w.quotes?.map((q) => q.content) ?? []),
    ...(w.tags ?? []),
    ...(w.categories ?? []),
    w.clientEntity?.name ?? "",
    w.umbrellaEntity?.name ?? "",
    ...(w.credits?.map((c) => c.name) ?? []),
    w.eventName ?? "",
    w.venue?.venueName ?? "",
    w.venue?.city ?? "",
    w.venue?.country ?? "",
  ]
  return norm(parts.join(" "))
}

export function collectCategories(works: Work[]): string[] {
  const s = new Set<string>()
  for (const w of works) {
    for (const c of w.categories ?? []) {
      if (isUncategorizedCategoryLabel(c)) continue
      s.add(c)
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "pt"))
}

export function collectTags(works: Work[]): string[] {
  const s = new Set<string>()
  for (const w of works) {
    for (const t of w.tags ?? []) {
      s.add(t)
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "pt"))
}

export function filterAndSortWorks(
  works: Work[],
  f: WorksFilterState,
): Work[] {
  const q = norm(f.search)
  let out = works.filter((w) => {
    if (q && !workHaystack(w).includes(q)) {
      return false
    }
    if (f.category !== "" && !(w.categories ?? []).includes(f.category)) {
      return false
    }
    if (f.tag !== "" && !(w.tags ?? []).includes(f.tag)) {
      return false
    }
    return true
  })

  out = [...out].sort((a, b) => {
    if (f.sort === "title-asc") {
      return a.title.localeCompare(b.title, "pt", { sensitivity: "base" })
    }
    const da = a.date ?? ""
    const db = b.date ?? ""
    if (f.sort === "date-asc") {
      return da.localeCompare(db)
    }
    return db.localeCompare(da)
  })

  return out
}
