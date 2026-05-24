import { sanitizeWorkMediaExternalUrl } from "./mediaEmbedUrl"
import type {
  ConfidenceLevel,
  EntityRef,
  LocaleCode,
  Work,
  WorkCredit,
  WorkLink,
  WorkMedia,
  WorkQuote,
  WorkTextBlock,
  WorkVenue,
} from "../types/content"

export type CanonicalWorkVenue = {
  venue_name?: string | null
  city?: string | null
  region_or_state?: string | null
  country?: string | null
  raw_location?: string | null
}

export type CanonicalWorkCredit = {
  role: string
  name: string
  sort_order?: number
  is_organization?: boolean
}

export type CanonicalWorkLink = {
  id?: string
  label: string
  url: string
  kind: WorkLink["kind"]
  preview_title?: string | null
  preview_description?: string | null
  preview_image?: string | null
}

export type CanonicalWorkDescription = {
  locale: LocaleCode
  kind: WorkTextBlock["kind"]
  content: string
}

export type CanonicalWorkQuote = {
  locale: LocaleCode
  content: string
  source_label?: string | null
  source_url?: string | null
}

export type CanonicalWorkMedia = {
  id?: string
  kind: "image" | "gallery" | "video_embed" | "audio_embed"
  local_path?: string | null
  external_url?: string | null
  platform?: string | null
  sort_order?: number
  gallery_items?: string[]
}

export type CanonicalWork = {
  slug: string
  title: string
  summary?: string | null
  summary_localized?: Partial<Record<LocaleCode, string>>
  body_html?: string | null
  categories?: string[]
  tags?: string[]
  legacy_wp_id?: number | null
  published_at?: string | null
  occurred_on?: string | null
  event_name?: string | null
  primary_category?: string | null
  venue?: CanonicalWorkVenue | null
  client?: EntityRef | null
  umbrella_entity?: EntityRef | null
  umbrella_entity_confidence?: ConfidenceLevel | null
  iteration_of_work_id?: string | null
  descriptions?: CanonicalWorkDescription[]
  quotes?: CanonicalWorkQuote[]
  credits?: CanonicalWorkCredit[]
  links?: CanonicalWorkLink[]
  media?: CanonicalWorkMedia[]
  featured_media?: CanonicalWorkMedia | null
  review_flags?: string[]
}

export function hydrateCanonicalWorks(entries: CanonicalWork[]): Work[] {
  return entries.map(hydrateCanonicalWork)
}

export function hydrateCanonicalWork(entry: CanonicalWork): Work {
  const textBlocks = (entry.descriptions ?? []).map(mapDescription)
  const media = expandCanonicalMedia(entry.media ?? [])
  const featuredMedia = entry.featured_media
    ? mapMedia(entry.featured_media, 0)
    : media.find((item) => item.kind === "image") ?? null
  const summary = entry.summary ?? undefined

  return {
    slug: entry.slug,
    title: entry.title,
    date: entry.published_at ?? entry.occurred_on ?? undefined,
    summary: summary,
    bodyHtml: entry.body_html ? entry.body_html : undefined,
    tags: entry.tags ?? [],
    categories: entry.categories ?? [],
    wpId: entry.legacy_wp_id ?? undefined,
    featuredImage:
      featuredMedia?.localUrl ?? featuredMedia?.externalUrl ?? undefined,
    featuredImageThumb:
      featuredMedia?.localUrl ?? featuredMedia?.externalUrl ?? undefined,
    publishedAt: entry.published_at ?? null,
    occurredOn: entry.occurred_on ?? null,
    eventName: entry.event_name ?? null,
    primaryCategory: entry.primary_category ?? null,
    venue: mapVenue(entry.venue),
    clientEntity: mapEntityRef(entry.client),
    umbrellaEntity: mapEntityRef(entry.umbrella_entity),
    umbrellaEntityConfidence: entry.umbrella_entity_confidence ?? null,
    iterationOfWorkSlug: entry.iteration_of_work_id ?? null,
    normalizedSummary: buildLocalizedSummary(summary, entry.summary_localized),
    textBlocks,
    quotes: (entry.quotes ?? []).map(mapQuote),
    credits: (entry.credits ?? []).map(mapCredit),
    mediaCredits: [],
    linksData: (entry.links ?? []).map(mapLink),
    media,
    featuredMedia,
    reviewFlags: entry.review_flags ?? [],
  }
}

function buildLocalizedSummary(
  summary: string | undefined,
  summaryLocalized: CanonicalWork["summary_localized"] | undefined,
): Partial<Record<LocaleCode, string>> {
  const out: Partial<Record<LocaleCode, string>> = {}
  if (summaryLocalized?.pt) out.pt = summaryLocalized.pt
  if (summaryLocalized?.en) out.en = summaryLocalized.en
  if (summary) {
    out.en ??= summary
    out.pt ??= summary
  }
  return out
}

function mapEntityRef(entity: EntityRef | null | undefined): EntityRef | null {
  if (!entity) return null
  return { ...entity }
}

function mapVenue(venue?: CanonicalWorkVenue | null): WorkVenue | null {
  if (!venue) return null
  return {
    venueName: venue.venue_name ?? null,
    city: venue.city ?? null,
    regionOrState: venue.region_or_state ?? null,
    country: venue.country ?? null,
    rawLocation: venue.raw_location ?? null,
  }
}

function mapDescription(item: CanonicalWorkDescription): WorkTextBlock {
  return {
    locale: item.locale,
    kind: item.kind,
    content: item.content,
  }
}

function mapQuote(item: CanonicalWorkQuote): WorkQuote {
  return {
    locale: item.locale,
    content: item.content,
    sourceLabel: item.source_label ?? null,
    sourceUrl: item.source_url ?? null,
  }
}

function mapCredit(item: CanonicalWorkCredit, index = 0): WorkCredit {
  const name = item.name
  return {
    id: `${item.role}-${name}-${index}`,
    role: item.role,
    name,
    sortOrder: item.sort_order ?? index,
    isOrganization: item.is_organization ?? false,
  }
}

function mapLink(item: CanonicalWorkLink, index = 0): WorkLink {
  return {
    id: item.id ?? `link-${index + 1}`,
    label: item.label,
    url: item.url,
    kind: item.kind,
    previewTitle: item.preview_title ?? null,
    previewDescription: item.preview_description ?? null,
    previewImage: item.preview_image ?? null,
  }
}

function expandCanonicalMedia(items: CanonicalWorkMedia[]): WorkMedia[] {
  const expanded: WorkMedia[] = []
  for (const item of items) {
    if (item.kind === "gallery" && item.gallery_items && item.gallery_items.length > 0) {
      for (const [index, imageUrl] of item.gallery_items.entries()) {
        expanded.push({
          id: `${item.id ?? "gallery"}-${index + 1}`,
          kind: "image",
          localUrl: imageUrl,
          externalUrl: null,
          platform: null,
          sortOrder: expanded.length,
        })
      }
      continue
    }
    expanded.push(mapMedia(item, expanded.length))
  }
  return expanded
}

function mapMedia(item: CanonicalWorkMedia, index: number): WorkMedia {
  return {
    id: item.id ?? `media-${index + 1}`,
    kind: item.kind === "gallery" ? "image" : item.kind,
    localUrl: item.local_path ?? null,
    externalUrl: sanitizeWorkMediaExternalUrl(item.external_url),
    platform: normalizePlatform(item.platform),
    sortOrder: item.sort_order ?? index,
  }
}

function normalizePlatform(
  platform?: string | null,
): WorkMedia["platform"] {
  if (platform === "youtube" || platform === "vimeo" || platform === "soundcloud") {
    return platform
  }
  return null
}
