import { useMemo, useState } from "react"
import {
  collectCategories,
  collectTags,
  filterAndSortWorks,
  type WorksFilterState,
  type WorksSortMode,
} from "../lib/filterWorks"
import { filterHighlightedWorks } from "../lib/highlightedWorks"
import { PortfolioWorksGrid } from "../components/PortfolioWorksGrid"
import { useWorks } from "../hooks/useWorks"

export type WorksPageProps = {
  /** Só as 42 obras da grelha «Highlighted» do site original (/p/works). */
  highlightedOnly?: boolean
}

function sortKind(m: WorksSortMode): "date" | "title" {
  return m === "title-asc" ? "title" : "date"
}

/** Evita foco no clique do rato (anel :focus-visible). Tab continua a funcionar. */
function preventMouseFocus(e: React.MouseEvent<HTMLElement>) {
  if (e.button !== 0) return
  e.preventDefault()
}

export function WorksPage({ highlightedOnly = false }: WorksPageProps = {}) {
  const { works, error, loading } = useWorks()
  const [filters, setFilters] = useState<WorksFilterState>({
    search: "",
    category: "",
    tag: "",
    sort: "date-desc",
  })
  const [showThumbs, setShowThumbs] = useState(true)

  const pool = useMemo(() => {
    if (!works) return null
    return highlightedOnly ? filterHighlightedWorks(works) : works
  }, [works, highlightedOnly])

  const categories = useMemo(
    () => (pool ? collectCategories(pool) : []),
    [pool],
  )
  const tags = useMemo(() => (pool ? collectTags(pool) : []), [pool])
  const visible = useMemo(
    () => (pool ? filterAndSortWorks(pool, filters) : []),
    [pool, filters],
  )

  const kind = sortKind(filters.sort)

  if (loading) {
    return (
      <div className="page portfolio-page">
        <p>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page portfolio-page">
        <p>Could not load works.</p>
      </div>
    )
  }

  if (!works || !pool) {
    return null
  }

  return (
    <div className="page portfolio-page">
      <h1 className="portfolio-page-heading">
        {highlightedOnly ? "Highlighted Works" : "portfolio"}
      </h1>

      <div className="tg-grid-toolbar">
        <div className="tg-grid-area-top1">
          <div className="tg-filters-holder tg-categories-holder">
            <button
              type="button"
              className={
                filters.category === ""
                  ? "tg-filter tg-filter-active tg-nav-font"
                  : "tg-filter tg-nav-font"
              }
              onMouseDown={preventMouseFocus}
              onClick={() => setFilters((f) => ({ ...f, category: "" }))}
            >
              <span className="tg-filter-name">
                All Categories ({pool.length})
              </span>
            </button>
            {categories.map((cat) => {
              const n = pool.filter((w) =>
                (w.categories ?? []).includes(cat),
              ).length
              return (
                <button
                  key={cat}
                  type="button"
                  className={
                    filters.category === cat
                      ? "tg-filter tg-filter-active tg-nav-font"
                      : "tg-filter tg-nav-font"
                  }
                  onMouseDown={preventMouseFocus}
                  onClick={() =>
                    setFilters((f) => ({ ...f, category: cat }))
                  }
                >
                  <span className="tg-filter-name">
                    {cat} ({n})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="tg-grid-area-top2">
          <div className="tg-sorters-holder">
            <div className="tg-sort-cluster">
              <label className="tg-dropdown-holder tg-nav-border tg-nav-font tg-sort-block">
                <span className="tg-dropdown-title tg-nav-color">Sort By</span>
                <span className="tg-sort-sep" aria-hidden>
                  &nbsp;
                </span>
                <select
                  className="tg-sort-select tg-nav-color tg-nav-font"
                  value={kind}
                  onChange={(e) => {
                    const v = e.target.value as "date" | "title"
                    if (v === "title") {
                      setFilters((f) => ({ ...f, sort: "title-asc" }))
                    } else {
                      setFilters((f) => ({ ...f, sort: "date-desc" }))
                    }
                  }}
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
              </label>
              {kind === "date" ? (
                <div
                  className="tg-sorter-order tg-nav-border tg-nav-color"
                  role="group"
                  aria-label="Sort order"
                >
                  <button
                    type="button"
                    className={
                      filters.sort === "date-desc"
                        ? "tg-sorter-dir tg-sorter-dir-active"
                        : "tg-sorter-dir"
                    }
                    aria-label="Newest first"
                    aria-pressed={filters.sort === "date-desc"}
                    onMouseDown={preventMouseFocus}
                    onClick={() =>
                      setFilters((f) => ({ ...f, sort: "date-desc" }))
                    }
                  >
                    <span className="tg-icon-sorter-down" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={
                      filters.sort === "date-asc"
                        ? "tg-sorter-dir tg-sorter-dir-active"
                        : "tg-sorter-dir"
                    }
                    aria-label="Oldest first"
                    aria-pressed={filters.sort === "date-asc"}
                    onMouseDown={preventMouseFocus}
                    onClick={() =>
                      setFilters((f) => ({ ...f, sort: "date-asc" }))
                    }
                  >
                    <span className="tg-icon-sorter-up" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="tg-thumbs-toggle tg-nav-font tg-nav-border tg-nav-color"
              aria-pressed={showThumbs}
              onMouseDown={preventMouseFocus}
              onClick={() => setShowThumbs((v) => !v)}
            >
              {showThumbs ? "Collapse all thumbs" : "Expand all thumbs"}
            </button>
          </div>

          <div className="tg-tags-search-group">
            <div className="tg-tags-slot">
              <div className="tg-dropdown-holder tg-nav-border tg-nav-font tg-tag-dropdown-wrap">
                <span className="tg-dropdown-title tg-nav-color">Tags</span>
                <span className="tg-icon-dropdown-open" aria-hidden />
                <select
                  id="works-tag-filter"
                  className="tg-tag-select-visible tg-nav-font"
                  value={filters.tag}
                  aria-label="Filter by tag"
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tag: e.target.value }))
                  }
                >
                  <option value="">All Tags ({pool.length})</option>
                  {tags.map((tag) => {
                    const n = pool.filter((w) =>
                      (w.tags ?? []).includes(tag),
                    ).length
                    return (
                      <option key={tag} value={tag}>
                        {tag} ({n})
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            <div className="tg-search-slot">
              <div className="tg-search-holder">
                <span className="tg-search-icon" aria-hidden />
                <div className="tg-search-inner">
                  <input
                    type="search"
                    className="tg-search tg-nav-font"
                    placeholder="SEARCH…"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, search: e.target.value }))
                    }
                    autoComplete="off"
                  />
                </div>
                {filters.search ? (
                  <button
                    type="button"
                    className="tg-search-clear"
                    aria-label="Clear search"
                    onMouseDown={preventMouseFocus}
                    onClick={() =>
                      setFilters((f) => ({ ...f, search: "" }))
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="tg-results-count" aria-live="polite">
        {visible.length} of {pool.length} entries
      </p>

      {visible.length === 0 ? (
        <p className="tg-empty">No results for these filters.</p>
      ) : (
        <PortfolioWorksGrid
          works={visible}
          showThumbs={showThumbs}
          highlightedWorksNav={highlightedOnly}
          onMouseDownLink={preventMouseFocus}
        />
      )}
    </div>
  )
}
