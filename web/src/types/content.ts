export type NavItem = {
  label: string
  to: string
}

export type SiteNav = {
  /** Nome exibido no cabeçalho e na página inicial */
  siteTitle?: string
  /** Subtítulo curto (ex.: tagline do site público) */
  tagline?: string
  /**
   * Corpo injectado na página inicial (slug de `pages.json`, ex. `portfolio`).
   * `""` ou `null` desactiva o bloco.
   */
  homeBodyPageSlug?: string | null
  items: NavItem[]
}

export type Work = {
  slug: string
  title: string
  date?: string
  summary?: string
  bodyHtml?: string
  tags?: string[]
  categories?: string[]
  wpId?: number
  /** URL da imagem em destaque (export a partir de `_thumbnail_id`) */
  featuredImage?: string | null
  /** Versão reduzida (medium_large / medium / thumbnail) para a grelha — export PHP */
  featuredImageThumb?: string | null
}

export type SitePage = {
  slug: string
  title: string
  excerpt?: string | null
  bodyHtml?: string
  wpId?: number
}

export type PagesData = {
  pages: SitePage[]
}

export type TimelineEvent = {
  id: string
  label: string
  year: number
  month?: number
  workSlug?: string
}