export type NavItem = {
  label: string
  to: string
}

export type LocaleCode = "en" | "pt"

export type ConfidenceLevel = "high" | "medium" | "low"

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

export type EntityRef = {
  id: string
  name: string
  slug: string
  kind?: string
}

export type WorkVenue = {
  venueName?: string | null
  city?: string | null
  regionOrState?: string | null
  country?: string | null
  rawLocation?: string | null
}

export type WorkCredit = {
  id: string
  role: string
  name: string
  sortOrder: number
  isOrganization?: boolean
}

export type WorkLink = {
  id: string
  label: string
  url: string
  kind: "external" | "reference" | "video" | "audio" | "press" | "project"
  previewTitle?: string | null
  previewDescription?: string | null
  previewImage?: string | null
}

export type WorkTextKind = "description" | "programme_notes"

export type WorkTextBlock = {
  locale: LocaleCode
  kind: WorkTextKind
  content: string
}

export type WorkQuote = {
  locale: LocaleCode
  content: string
  sourceLabel?: string | null
  sourceUrl?: string | null
}

export type WorkMediaKind = "image" | "gallery" | "video_embed" | "audio_embed"

export type WorkMediaPlatform =
  | "youtube"
  | "vimeo"
  | "soundcloud"
  | "external"

export type WorkMedia = {
  id: string
  kind: WorkMediaKind
  title?: string | null
  localUrl?: string | null
  externalUrl?: string | null
  platform?: WorkMediaPlatform | null
  sortOrder: number
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
  publishedAt?: string | null
  occurredOn?: string | null
  eventName?: string | null
  primaryCategory?: string | null
  venue?: WorkVenue | null
  clientEntity?: EntityRef | null
  umbrellaEntity?: EntityRef | null
  umbrellaEntityConfidence?: ConfidenceLevel | null
  iterationOfWorkSlug?: string | null
  normalizedSummary?: Partial<Record<LocaleCode, string>>
  textBlocks?: WorkTextBlock[]
  quotes?: WorkQuote[]
  credits?: WorkCredit[]
  mediaCredits?: WorkCredit[]
  linksData?: WorkLink[]
  media?: WorkMedia[]
  featuredMedia?: WorkMedia | null
  reviewFlags?: string[]
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