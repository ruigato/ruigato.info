import type {
  ConfidenceLevel,
  EntityRef,
  LocaleCode,
  Work,
  WorkCredit,
  WorkLink,
  WorkMedia,
  WorkMediaPlatform,
  WorkQuote,
  WorkTextBlock,
  WorkVenue,
} from "../types/content"
import { prepareLegacyBodyHtml, rewriteLegacyMediaUrl } from "./legacyHtml"

const SECTION_MARKERS = [
  "description",
  "links",
  "team",
  "special thanks to",
  "agradecimentos",
  "show",
] as const

const META_LABELS = new Set([
  "name",
  "date",
  "type",
  "event",
  "city",
  "place",
  "location",
  "client",
  "collaboration",
])

const ENTITY_NAME_MAP = new Map<string, string>([
  ["ocubo", "OCUBO"],
  ["alta", "ALTA"],
  ["how", "HOW"],
  ["ccc.cr", "CCC.CR"],
  ["jgm", "Companhia João Garcia Miguel"],
  ["companhia joao garcia miguel", "Companhia João Garcia Miguel"],
  ["joao garcia miguel", "João Garcia Miguel"],
  ["joão garcia miguel", "João Garcia Miguel"],
  ["datagrama", "Datagrama"],
  ["blakat", "Blakat"],
  ["edp foundation", "Fundação EDP"],
  ["fundacao edp", "Fundação EDP"],
  ["fundação edp", "Fundação EDP"],
])

const CITY_MAP = new Map<string, string>([
  ["lisboa", "Lisbon"],
  ["porto", "Porto"],
  ["berlim", "Berlin"],
  ["veneza", "Venice"],
  ["madrid", "Madrid"],
  ["sao paulo", "Sao Paulo"],
  ["são paulo", "Sao Paulo"],
  ["rio de janeiro", "Rio de Janeiro"],
  ["bilbau", "Bilbao"],
  ["ilhavo", "Ilhavo"],
  ["ilhavo", "Ilhavo"],
  ["caldas da rainha", "Caldas da Rainha"],
  ["torres vedras", "Torres Vedras"],
  ["idanha-a-nova", "Idanha-a-Nova"],
  ["idanha a nova", "Idanha-a-Nova"],
  ["aveiro", "Aveiro"],
  ["ericeira", "Ericeira"],
  ["arraiolos", "Arraiolos"],
  ["doha", "Doha"],
  ["live oak", "Live Oak"],
  ["leiria", "Leiria"],
  ["braga", "Braga"],
  ["cascais", "Cascais"],
])

const REGION_MAP = new Map<string, string>([
  ["florida", "Florida"],
  ["asturias", "Asturias"],
])

const COUNTRY_MAP = new Map<string, string>([
  ["portugal", "Portugal"],
  ["reino unido", "United Kingdom"],
  ["united kingdom", "United Kingdom"],
  ["espanha", "Spain"],
  ["spain", "Spain"],
  ["alemanha", "Germany"],
  ["germany", "Germany"],
  ["italia", "Italy"],
  ["itilia", "Italy"],
  ["itália", "Italy"],
  ["italy", "Italy"],
  ["brasil", "Brazil"],
  ["brazil", "Brazil"],
  ["qatar", "Qatar"],
  ["eua", "United States"],
  ["estados unidos", "United States"],
  ["united states", "United States"],
  ["inglaterra", "United Kingdom"],
  ["espanha", "Spain"],
])

const UMBRELLA_ENTITIES: Array<{
  name: string
  kind: string
  high: Array<(ctx: InferContext) => boolean>
  medium: Array<(ctx: InferContext) => boolean>
}> = [
  {
    name: "HOW",
    kind: "studio",
    high: [
      (ctx) => ctx.tags.has("HOW"),
      (ctx) => ctx.place === "HOW",
      (ctx) => /horse on wheels/.test(ctx.allText),
    ],
    medium: [
      (ctx) =>
        ctx.tags.has("3D") &&
        (ctx.tags.has("motion graphics") || ctx.tags.has("television")),
    ],
  },
  {
    name: "Companhia João Garcia Miguel",
    kind: "company",
    high: [
      (ctx) => /companhia jo[aã]o garcia miguel|companhia jgm/.test(ctx.allText),
      (ctx) => /only connect/.test(ctx.allText),
    ],
    medium: [
      (ctx) => ctx.clientName === "João Garcia Miguel",
      (ctx) =>
        ctx.clientName === "João Garcia Miguel" &&
        (ctx.tags.has("theatre") || /teatro|theatre/.test(ctx.allText)),
    ],
  },
  {
    name: "OCUBO",
    kind: "company",
    high: [
      (ctx) => ctx.tags.has("OCUBO"),
      (ctx) => ctx.clientName === "OCUBO",
      (ctx) => /context of ocubo|ocubo and olab|type:.*ocubo/.test(ctx.rawHtml),
    ],
    medium: [(ctx) => /ocubo team/.test(ctx.allText)],
  },
  {
    name: "ALTA",
    kind: "company",
    high: [
      (ctx) => ctx.tags.has("ALTA"),
      (ctx) => /alta\.international/.test(ctx.allText),
    ],
    medium: [
      (ctx) =>
        ctx.collaborationNames.includes("ALTA") ||
        /design experiencial|experiential design|videomapping/.test(ctx.allText),
    ],
  },
  {
    name: "Blakat",
    kind: "collective",
    high: [(ctx) => ctx.tags.has("blakat")],
    medium: [(ctx) => /blakat/.test(ctx.allText)],
  },
  {
    name: "Datagrama",
    kind: "collective",
    high: [(ctx) => ctx.tags.has("datagrama")],
    medium: [(ctx) => /datagrama/.test(ctx.allText)],
  },
]

type ParsedSections = {
  meta: Record<string, string>
  descriptions: Partial<Record<LocaleCode, string[]>>
  programmeNotes: Partial<Record<LocaleCode, string[]>>
  quotes: WorkQuote[]
  credits: WorkCredit[]
  mediaCredits: WorkCredit[]
  inlineLinks: WorkLink[]
  reviewFlags: Set<string>
}

type InferContext = {
  rawHtml: string
  allText: string
  tags: Set<string>
  clientName: string | null
  place: string | null
  collaborationNames: string[]
}

export function normalizeWorks(works: Work[]): Work[] {
  const normalized = works.map((work) => normalizeWork(work))
  const firstByBase = buildIterationMap(normalized)
  return normalized.map((work) => {
    const base = findIterationBase(work, normalized)
    return base ? { ...work, iterationOfWorkSlug: firstByBase.get(base) ?? null } : work
  })
}

export function getLocalizedSummary(
  work: Work,
  locale: LocaleCode,
): string | null {
  const preferred = work.normalizedSummary?.[locale]
  if (preferred) return preferred
  return locale === "en"
    ? (work.normalizedSummary?.pt ?? null)
    : (work.normalizedSummary?.en ?? null)
}

export function getLocalizedText(
  work: Work,
  kind: WorkTextBlock["kind"],
  locale: LocaleCode,
): string | null {
  const blocks = (work.textBlocks ?? []).filter((b) => b.kind === kind)
  const exact = blocks.find((b) => b.locale === locale)
  if (exact) return exact.content
  const fallback = blocks.find((b) => b.locale !== locale)
  return fallback?.content ?? null
}

function normalizeForSummaryDedup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/[""'`´]/gu, "")
    .trim()
}

/** Descrições até este tamanho podem ser omitidas se o resumo já as contiver. */
const BRIEF_DESCRIPTION_MAX_CHARS = 480

/**
 * True quando a descrição não acrescenta nada ao resumo (igualdade, ou frase curta já incluída no resumo).
 * Usar na ficha da obra para não mostrar duas secções com o mesmo texto.
 */
export function descriptionIsRedundantWithSummary(
  summary: string | null,
  description: string | null,
): boolean {
  if (!summary?.trim() || !description?.trim()) return false
  const s = normalizeForSummaryDedup(summary)
  const d = normalizeForSummaryDedup(description)
  if (!s || !d) return false
  if (s === d) return true
  if (d.length > BRIEF_DESCRIPTION_MAX_CHARS) return false
  if (d.length < 24) return false
  return s.includes(d)
}

export function groupCreditsByRole(credits: WorkCredit[]): Array<{
  role: string
  items: WorkCredit[]
}> {
  const order: string[] = []
  const map = new Map<string, WorkCredit[]>()
  for (const credit of credits) {
    if (!map.has(credit.role)) {
      order.push(credit.role)
      map.set(credit.role, [])
    }
    map.get(credit.role)?.push(credit)
  }
  return order.map((role) => ({ role, items: map.get(role) ?? [] }))
}

export function formatVenueLabel(venue?: WorkVenue | null): string | null {
  if (!venue) return null
  const parts = [
    venue.venueName,
    venue.city,
    venue.regionOrState,
    venue.country,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

function normalizeWork(work: Work): Work {
  const preparedBodyHtml = work.bodyHtml ? prepareLegacyBodyHtml(work.bodyHtml) : ""
  const bodyBlocks = collectTextBlocks(work.bodyHtml ?? "")
  const summaryBlocks = collectSummaryBlocks(work.summary ?? "")

  const bodyParsed = parseStructuredSections(bodyBlocks)
  const summaryParsed = parseStructuredSections(summaryBlocks)

  const meta = mergeMeta(bodyParsed.meta, summaryParsed.meta)
  const descriptions = mergeLocaleBuckets(
    bodyParsed.descriptions,
    summaryParsed.descriptions,
  )
  const programmeNotes = mergeLocaleBuckets(
    bodyParsed.programmeNotes,
    summaryParsed.programmeNotes,
  )
  const quotes = dedupeQuotes([...bodyParsed.quotes, ...summaryParsed.quotes])
  const credits = dedupeCredits([
    ...creditsFromMeta(meta.collaboration, "collaboration"),
    ...bodyParsed.credits,
    ...summaryParsed.credits,
  ])
  const mediaCredits = dedupeCredits([
    ...bodyParsed.mediaCredits,
    ...summaryParsed.mediaCredits,
  ])

  const linksData = dedupeLinks([
    ...extractLinks(preparedBodyHtml),
    ...bodyParsed.inlineLinks,
    ...summaryParsed.inlineLinks,
  ])
  const media = extractMedia(preparedBodyHtml)
  const reviewFlags = new Set<string>([
    ...bodyParsed.reviewFlags,
    ...summaryParsed.reviewFlags,
  ])

  const titleFromMeta = cleanText(meta.name ?? "")
  if (titleFromMeta && !sameComparable(titleFromMeta, work.title)) {
    reviewFlags.add("manual_title_conflict")
  }

  const { publishedAt, occurredOn } = resolveDates(work.date ?? null, meta.date ?? null)
  if (publishedAt && occurredOn && publishedAt !== occurredOn) {
    reviewFlags.add("manual_date_conflict")
  }

  const venue = normalizeVenue(meta)
  const clientEntity = entityFromName(meta.client ?? null, "client")
  const umbrella = inferUmbrellaEntity({
    rawHtml: `${work.bodyHtml ?? ""}\n${work.summary ?? ""}`,
    allText: normalizeForSearch(
      [
        work.title,
        work.summary ?? "",
        work.bodyHtml ?? "",
        ...(work.tags ?? []),
        ...(work.categories ?? []),
      ].join(" "),
    ),
    tags: new Set(work.tags ?? []),
    clientName: clientEntity?.name ?? null,
    place: venue?.venueName ?? null,
    collaborationNames: credits
      .filter((credit) => credit.role === "collaboration")
      .map((credit) => credit.name),
  })
  if (umbrella?.confidence === "low") {
    reviewFlags.add("manual_umbrella_entity")
  }

  const primaryCategory =
    work.categories && work.categories.length === 1 ? work.categories[0] : null
  if ((work.categories?.length ?? 0) > 1) {
    reviewFlags.add("manual_primary_category")
  }

  const normalizedSummary = buildLocalizedSummary(work.summary ?? null, descriptions, linksData)

  if (summaryLooksStructured(work.summary ?? "")) {
    reviewFlags.add("summary_secondary_source_used")
  }

  const featuredMedia = resolveFeaturedMedia(
    work,
    media,
    mediaCredits,
  )

  return {
    ...work,
    summary: normalizedSummary.en ?? normalizedSummary.pt ?? work.summary,
    featuredImage:
      work.featuredImage ??
      featuredMedia?.localUrl ??
      featuredMedia?.externalUrl ??
      null,
    featuredImageThumb:
      work.featuredImageThumb ??
      featuredMedia?.localUrl ??
      featuredMedia?.externalUrl ??
      null,
    publishedAt,
    occurredOn,
    eventName: meta.event ?? null,
    primaryCategory,
    venue,
    clientEntity,
    umbrellaEntity: umbrella
      ? entityFromName(umbrella.name, umbrella.kind)
      : null,
    umbrellaEntityConfidence: umbrella?.confidence ?? null,
    normalizedSummary,
    textBlocks: buildTextBlocks(descriptions, programmeNotes),
    quotes,
    credits,
    mediaCredits,
    linksData,
    media,
    featuredMedia,
    reviewFlags: [...reviewFlags],
  }
}

function buildIterationMap(works: Work[]): Map<string, string> {
  const first = new Map<string, string>()
  for (const work of works) {
    const base = normalizeIterationBase(work.title)
    if (!base) continue
    const current = first.get(base)
    if (!current) {
      first.set(base, work.slug)
      continue
    }
    const currentWork = works.find((item) => item.slug === current)
    const currentDate = currentWork?.date ?? currentWork?.publishedAt ?? ""
    const nextDate = work.date ?? work.publishedAt ?? ""
    if (nextDate < currentDate) {
      first.set(base, work.slug)
    }
  }
  return first
}

function findIterationBase(work: Work, works: Work[]): string | null {
  const base = normalizeIterationBase(work.title)
  if (!base) return null
  const matches = works.filter((item) => normalizeIterationBase(item.title) === base)
  return matches.length > 1 ? base : null
}

function normalizeIterationBase(title: string): string | null {
  const base = title
    .replace(/\s*@\s+.+$/u, "")
    .replace(/\s+\(v\d+\)$/iu, "")
    .replace(/\s+v\d+$/iu, "")
    .replace(/\s+#\d+$/u, "")
    .trim()
  return base === title.trim() ? null : base
}

function collectSummaryBlocks(summary: string): string[] {
  return splitPlainBlocks(summary)
}

function collectTextBlocks(html: string): string[] {
  const doc = parseHtml(html)
  if (!doc) {
    return splitPlainBlocks(stripHtml(html))
  }
  const blocks: string[] = []
  for (const el of Array.from(doc.body.children)) {
    if (isMediaElement(el)) continue
    const text = textFromElement(el)
    if (text) blocks.push(text)
  }
  return blocks
}

function parseStructuredSections(blocks: string[]): ParsedSections {
  const parsed: ParsedSections = {
    meta: {},
    descriptions: {},
    programmeNotes: {},
    quotes: [],
    credits: [],
    mediaCredits: [],
    inlineLinks: [],
    reviewFlags: new Set<string>(),
  }

  let activeSection:
    | { type: "description"; locale: LocaleCode }
    | { type: "links" }
    | { type: "team" }
    | { type: "special_thanks" }
    | null = null

  for (const rawBlock of blocks) {
    let block = cleanText(rawBlock)
    if (!block) continue

    const { meta, remainder } = peelMetaLines(block)
    Object.assign(parsed.meta, meta)
    block = remainder
    if (!block) continue

    const descriptionStart = matchDescriptionMarker(block)
    if (descriptionStart) {
      activeSection = { type: "description", locale: descriptionStart.locale }
      if (descriptionStart.content) {
        pushLocaleText(
          parsed.descriptions,
          descriptionStart.locale,
          descriptionStart.content,
        )
      }
      continue
    }

    const linksStart = matchSimpleSection(block, "links")
    if (linksStart) {
      activeSection = { type: "links" }
      const inline = extractLinksFromText(block)
      if (inline.length > 0) parsed.inlineLinks.push(...inline)
      continue
    }

    const teamStart = matchSimpleSection(block, "team")
    if (teamStart) {
      activeSection = { type: "team" }
      const body = removeLeadingLabel(block)
      if (body) parsed.credits.push(...parseRoleBlock(body, "team"))
      continue
    }

    if (/^(special thanks to|agradecimentos)\s*:/iu.test(block)) {
      activeSection = { type: "special_thanks" }
      const body = removeLeadingLabel(block)
      if (body) parsed.credits.push(...parseNameListBlock(body, "special_thanks"))
      continue
    }

    if (isTechnicalCreditBlock(block)) {
      activeSection = null
      parsed.credits.push(...parseTechnicalCreditBlock(block))
      continue
    }

    if (looksLikeProgrammeNotes(block)) {
      activeSection = null
      pushLocaleText(parsed.programmeNotes, detectLocale(block), block)
      continue
    }

    if (looksLikeMediaCredit(block)) {
      activeSection = null
      parsed.mediaCredits.push(...parseMediaCreditBlock(block))
      continue
    }

    if (looksLikeQuote(block)) {
      activeSection = null
      parsed.quotes.push(parseQuote(block))
      continue
    }

    if (activeSection?.type === "description") {
      pushLocaleText(parsed.descriptions, activeSection.locale, block)
      continue
    }

    if (activeSection?.type === "links") {
      const inline = extractLinksFromText(block)
      if (inline.length > 0) {
        parsed.inlineLinks.push(...inline)
      } else if (looksLikeMediaCredit(block)) {
        parsed.mediaCredits.push(...parseMediaCreditBlock(block))
      }
      continue
    }

    if (activeSection?.type === "team") {
      parsed.credits.push(...parseRoleBlock(block, "team"))
      continue
    }

    if (activeSection?.type === "special_thanks") {
      parsed.credits.push(...parseNameListBlock(block, "special_thanks"))
      continue
    }

    pushLocaleText(parsed.descriptions, detectLocale(block), block)
  }

  return parsed
}

function peelMetaLines(block: string): {
  meta: Record<string, string>
  remainder: string
} {
  const meta: Record<string, string> = {}
  const remaining: string[] = []
  for (const line of block.split(/\n+/u)) {
    const match = line.match(/^([^:]+):\s*(.+)$/u)
    if (!match) {
      remaining.push(line)
      continue
    }
    const label = normalizeKey(match[1])
    if (META_LABELS.has(label)) {
      meta[label] = cleanText(match[2])
      continue
    }
    remaining.push(line)
  }
  return {
    meta,
    remainder: cleanText(remaining.join("\n")),
  }
}

function buildLocalizedSummary(
  summary: string | null,
  descriptions: Partial<Record<LocaleCode, string[]>>,
  links: WorkLink[],
): Partial<Record<LocaleCode, string>> {
  const out: Partial<Record<LocaleCode, string>> = {}
  const cleaned = cleanSummary(summary ?? "")
  if (cleaned) {
    out[detectLocale(cleaned)] = cleaned
  }
  if (!out.en && descriptions.en?.length) {
    out.en = summarizeText(descriptions.en.join(" "))
  }
  if (!out.pt && descriptions.pt?.length) {
    out.pt = summarizeText(descriptions.pt.join(" "))
  }
  if (!out.en && out.pt) out.en = out.pt
  if (!out.pt && out.en) out.pt = out.en
  if (links.length > 0) {
    if (out.en) out.en = cleanSummary(out.en)
    if (out.pt) out.pt = cleanSummary(out.pt)
  }
  return out
}

function buildTextBlocks(
  descriptions: Partial<Record<LocaleCode, string[]>>,
  programmeNotes: Partial<Record<LocaleCode, string[]>>,
): WorkTextBlock[] {
  const blocks: WorkTextBlock[] = []
  for (const locale of ["en", "pt"] as const) {
    const description = cleanText((descriptions[locale] ?? []).join("\n\n"))
    if (description) blocks.push({ locale, kind: "description", content: description })
    const notes = cleanText((programmeNotes[locale] ?? []).join("\n\n"))
    if (notes) blocks.push({ locale, kind: "programme_notes", content: notes })
  }
  return blocks
}

function resolveDates(
  legacyDate: string | null,
  metaDate: string | null,
): { publishedAt: string | null; occurredOn: string | null } {
  if (legacyDate && metaDate) {
    return { publishedAt: legacyDate, occurredOn: metaDate }
  }
  if (legacyDate) return { publishedAt: legacyDate, occurredOn: legacyDate }
  if (metaDate) return { publishedAt: metaDate, occurredOn: metaDate }
  return { publishedAt: null, occurredOn: null }
}

function normalizeVenue(meta: Record<string, string>): WorkVenue | null {
  const venue: WorkVenue = {}

  if (meta.location) {
    const parts = meta.location.split(",").map((part) => cleanText(part))
    if (parts.length >= 2) {
      venue.venueName = normalizeVenueName(parts[0], null)
      const geo = normalizeGeoParts(parts.slice(1))
      venue.city = geo.city
      venue.regionOrState = geo.regionOrState
      venue.country = geo.country
    } else {
      venue.venueName = normalizeVenueName(meta.location, null)
    }
    venue.rawLocation = meta.location
  }

  if (meta.city) {
    const geo = normalizeGeoParts(meta.city.split(",").map((part) => cleanText(part)))
    venue.city = geo.city ?? venue.city
    venue.regionOrState = geo.regionOrState ?? venue.regionOrState
    venue.country = geo.country ?? venue.country
    venue.rawLocation = venue.rawLocation ?? meta.city
  }

  if (meta.place) {
    const normalizedVenue = normalizeVenueName(meta.place, venue.city ?? null)
    if (normalizedVenue) {
      venue.venueName = venue.venueName ?? normalizedVenue
    }
  }

  const hasContent = Object.values(venue).some(Boolean)
  return hasContent ? venue : null
}

function normalizeGeoParts(parts: string[]): {
  city: string | null
  regionOrState: string | null
  country: string | null
} {
  const out = {
    city: null as string | null,
    regionOrState: null as string | null,
    country: null as string | null,
  }
  if (parts.length === 0) return out
  out.city = normalizeCity(parts[0])
  if (parts.length >= 2) {
    const second = normalizeCountry(parts[1])
    if (second) out.country = second
    else out.regionOrState = normalizeRegion(parts[1])
  }
  if (parts.length >= 3) {
    out.country = normalizeCountry(parts[2]) ?? out.country
  }
  return out
}

function normalizeVenueName(
  value: string | null,
  city: string | null,
): string | null {
  if (!value) return null
  const cleaned = normalizeDisplayLabel(value)
  if (!cleaned) return null
  return sameComparable(cleaned, city ?? "") ? null : cleaned
}

function entityFromName(value: string | null, kind: string): EntityRef | null {
  if (!value) return null
  const normalized = normalizeEntityName(value)
  if (!normalized) return null
  return {
    id: slugify(normalized),
    name: normalized,
    slug: slugify(normalized),
    kind,
  }
}

function inferUmbrellaEntity(
  ctx: InferContext,
): { name: string; kind: string; confidence: ConfidenceLevel } | null {
  for (const candidate of UMBRELLA_ENTITIES) {
    if (candidate.high.some((rule) => rule(ctx))) {
      return { name: candidate.name, kind: candidate.kind, confidence: "high" }
    }
  }
  for (const candidate of UMBRELLA_ENTITIES) {
    if (candidate.medium.some((rule) => rule(ctx))) {
      return { name: candidate.name, kind: candidate.kind, confidence: "medium" }
    }
  }
  return null
}

function extractMedia(html: string): WorkMedia[] {
  const doc = parseHtml(html)
  if (!doc) return []

  const media: WorkMedia[] = []
  const seen = new Set<string>()

  const pushMedia = (item: Omit<WorkMedia, "id">) => {
    const key = `${item.kind}::${item.localUrl ?? item.externalUrl ?? ""}`
    if (!key || seen.has(key)) return
    seen.add(key)
    media.push({ id: `${item.kind}-${media.length + 1}`, ...item })
  }

  for (const img of Array.from(doc.querySelectorAll("img[src]"))) {
    const src = rewriteLegacyMediaUrl(img.getAttribute("src") ?? "")
    if (!src) continue
    pushMedia({
      kind: "image",
      localUrl: src,
      sortOrder: media.length,
      title: null,
      platform: null,
    })
  }

  for (const iframe of Array.from(doc.querySelectorAll("iframe[src]"))) {
    const src = iframe.getAttribute("src") ?? ""
    const platform = detectMediaPlatform(src)
    pushMedia({
      kind: platform === "soundcloud" ? "audio_embed" : "video_embed",
      externalUrl: src,
      platform,
      sortOrder: media.length,
      title: null,
    })
  }

  for (const anchor of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = anchor.getAttribute("href") ?? ""
    const platform = detectMediaPlatform(href)
    if (!platform) continue
    pushMedia({
      kind: platform === "soundcloud" ? "audio_embed" : "video_embed",
      externalUrl: href,
      platform,
      sortOrder: media.length,
      title: null,
    })
  }

  return media
}

function extractLinks(html: string): WorkLink[] {
  const doc = parseHtml(html)
  if (!doc) return []

  const links: WorkLink[] = []
  const seen = new Set<string>()

  for (const anchor of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = anchor.getAttribute("href") ?? ""
    if (!href) continue
    if (detectMediaPlatform(href)) continue
    if (seen.has(href)) continue
    seen.add(href)
    const label = cleanText(anchor.textContent ?? "") || href
    links.push({
      id: `link-${links.length + 1}`,
      label,
      url: href,
      kind: "external",
      previewTitle: label,
      previewDescription: null,
      previewImage: null,
    })
  }

  return links
}

function resolveFeaturedMedia(
  work: Work,
  media: WorkMedia[],
  mediaCredits: WorkCredit[],
): WorkMedia | null {
  const explicit =
    work.featuredImage || work.featuredImageThumb
      ? {
          id: "featured-explicit",
          kind: "image" as const,
          localUrl: rewriteLegacyMediaUrl(
            work.featuredImageThumb ?? work.featuredImage ?? "",
          ),
          sortOrder: -1,
          title: null,
          platform: null,
        }
      : null

  const firstImage = media.find((item) => item.kind === "image")
  const picked = explicit ?? firstImage ?? null
  if (!picked) return null
  if (mediaCredits.length > 0) {
    return { ...picked }
  }
  return picked
}

function parseTechnicalCreditBlock(block: string): WorkCredit[] {
  const credits: WorkCredit[] = []
  const lines = block.split(/\n+/u).filter(Boolean)
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/u)
    if (!match) continue
    const role = slugify(match[1]).replace(/-/g, "_")
    credits.push(...parseNames(match[2], role))
  }
  return credits
}

function parseRoleBlock(block: string, fallbackRole: string): WorkCredit[] {
  const credits: WorkCredit[] = []
  for (const line of block.split(/\n+/u).filter(Boolean)) {
    const byMatch = line.match(/^(.+?)\s+by\s+(.+)$/iu)
    if (byMatch) {
      credits.push(
        ...parseNames(
          byMatch[2],
          slugify(byMatch[1]).replace(/-/g, "_") || fallbackRole,
        ),
      )
      continue
    }
    credits.push(...parseNames(line, fallbackRole))
  }
  return credits
}

function parseMediaCreditBlock(block: string): WorkCredit[] {
  const clean = block.replace(/^photo by:\s*/iu, "").replace(/^fotos de\s*/iu, "")
  return parseNames(clean, "photography")
}

function parseNameListBlock(block: string, role: string): WorkCredit[] {
  return block
    .split(/\n+/u)
    .flatMap((line) => parseNames(line, role))
}

function creditsFromMeta(value: string | undefined, role: string): WorkCredit[] {
  if (!value) return []
  if (isNA(value)) return []
  return parseNames(value, role)
}

function parseNames(value: string, role: string): WorkCredit[] {
  const out: WorkCredit[] = []
  const trimmed = cleanText(value)
  if (!trimmed || isNA(trimmed)) return out

  const parenOrg = trimmed.match(/^(.*)\(([^)]+)\)\s*$/u)
  if (parenOrg) {
    const people = splitNames(parenOrg[1])
    const org = normalizeEntityName(parenOrg[2])
    if (org) {
      out.push(makeCredit(org, role, out.length, true))
    }
    for (const person of people) {
      out.push(makeCredit(person, role, out.length, false))
    }
    return out
  }

  for (const name of splitNames(trimmed)) {
    out.push(makeCredit(name, role, out.length, isOrganizationName(name)))
  }
  return out
}

function splitNames(value: string): string[] {
  return value
    .replace(/\s+and\s+/giu, ",")
    .replace(/\s+e\s+/giu, ",")
    .replace(/\s+\/\s+/gu, ",")
    .split(",")
    .map((part) => normalizeEntityName(part))
    .filter((part): part is string => Boolean(part && !isNA(part)))
}

function makeCredit(
  name: string,
  role: string,
  sortOrder: number,
  isOrganization: boolean,
): WorkCredit {
  return {
    id: `${role}-${slugify(name)}-${sortOrder}`,
    role,
    name,
    sortOrder,
    isOrganization,
  }
}

function dedupeCredits(credits: WorkCredit[]): WorkCredit[] {
  const seen = new Set<string>()
  const out: WorkCredit[] = []
  for (const credit of credits) {
    const key = `${credit.role}::${normalizeComparable(credit.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...credit, sortOrder: out.length })
  }
  return out
}

function dedupeLinks(links: WorkLink[]): WorkLink[] {
  const seen = new Set<string>()
  const out: WorkLink[] = []
  for (const link of links) {
    if (seen.has(link.url)) continue
    seen.add(link.url)
    out.push({ ...link, id: `link-${out.length + 1}` })
  }
  return out
}

function dedupeQuotes(quotes: WorkQuote[]): WorkQuote[] {
  const seen = new Set<string>()
  const out: WorkQuote[] = []
  for (const quote of quotes) {
    const key = `${quote.locale}::${normalizeComparable(quote.content)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(quote)
  }
  return out
}

function pushLocaleText(
  bucket: Partial<Record<LocaleCode, string[]>>,
  locale: LocaleCode,
  text: string,
) {
  const cleaned = cleanText(text)
  if (!cleaned) return
  const target = bucket[locale] ?? []
  target.push(cleaned)
  bucket[locale] = target
}

function mergeMeta(
  primary: Record<string, string>,
  secondary: Record<string, string>,
): Record<string, string> {
  return { ...secondary, ...primary }
}

function mergeLocaleBuckets(
  primary: Partial<Record<LocaleCode, string[]>>,
  secondary: Partial<Record<LocaleCode, string[]>>,
): Partial<Record<LocaleCode, string[]>> {
  const out: Partial<Record<LocaleCode, string[]>> = {}
  for (const locale of ["en", "pt"] as const) {
    const merged = [...(primary[locale] ?? []), ...(secondary[locale] ?? [])]
    if (merged.length > 0) out[locale] = merged
  }
  return out
}

function matchDescriptionMarker(block: string):
  | { locale: LocaleCode; content: string | null }
  | null {
  const match = block.match(/^description\s+(EN|PT)\s*:?\s*(.*)$/iu)
  if (!match) return null
  return {
    locale: match[1].toLowerCase() as LocaleCode,
    content: cleanText(match[2]) || null,
  }
}

function matchSimpleSection(
  block: string,
  label: (typeof SECTION_MARKERS)[number],
): boolean {
  return new RegExp(`^${label}\\s*:`, "iu").test(block)
}

function removeLeadingLabel(block: string): string {
  return cleanText(block.replace(/^[^:]+:\s*/u, ""))
}

function looksLikeProgrammeNotes(block: string): boolean {
  return /^\d{1,2}:\d{2}\b/u.test(block) || /panel|closing speeches/u.test(block)
}

function isTechnicalCreditBlock(block: string): boolean {
  if (/^show$/iu.test(block)) return true
  return /^(art direction|music|light design|concept|videomapping|coding|show)\b/iu.test(
    block,
  )
}

function looksLikeMediaCredit(block: string): boolean {
  return /^(photo by:|fotos de )/iu.test(block)
}

function looksLikeQuote(block: string): boolean {
  return /^["“]/u.test(block) || /\s-\s+in\s+/iu.test(block)
}

function parseQuote(block: string): WorkQuote {
  const sourceMatch = block.match(/\s-\s+in\s+(.+)$/iu)
  const content = cleanText(
    sourceMatch ? block.slice(0, sourceMatch.index) : block,
  ).replace(/^["“]|["”]$/gu, "")
  return {
    locale: detectLocale(content),
    content,
    sourceLabel: sourceMatch ? cleanText(sourceMatch[1]) : null,
    sourceUrl: null,
  }
}

function extractLinksFromText(text: string): WorkLink[] {
  const matches = text.match(/https?:\/\/[^\s)]+/giu) ?? []
  return matches.map((url, index) => ({
    id: `inline-link-${index + 1}`,
    label: url,
    url,
    kind: "external",
    previewTitle: url,
    previewDescription: null,
    previewImage: null,
  }))
}

function summaryLooksStructured(summary: string): boolean {
  return /team:|special thanks to:|agradecimentos:|https?:\/\//iu.test(summary)
}

function cleanSummary(summary: string): string {
  const lines = summary
    .split(/\r?\n/u)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//iu.test(line))
    .filter((line) => !/^(team|special thanks to|agradecimentos|links)\s*:/iu.test(line))
  return summarizeText(lines.join(" "))
}

function summarizeText(text: string): string {
  const cleaned = cleanText(text)
  if (!cleaned) return ""
  if (cleaned.length <= 220) return cleaned
  const sentence = cleaned.match(/^(.+?[.!?])(?:\s|$)/u)?.[1]
  if (sentence && sentence.length <= 220) return sentence
  return cleaned.slice(0, 217).trimEnd() + "..."
}

function detectMediaPlatform(url: string): WorkMediaPlatform | null {
  if (/youtu\.be|youtube\.com/iu.test(url)) return "youtube"
  if (/vimeo\.com/iu.test(url)) return "vimeo"
  if (/soundcloud\.com/iu.test(url)) return "soundcloud"
  return null
}

function detectLocale(text: string): LocaleCode {
  const sample = normalizeComparable(text)
  const ptHits =
    countMatches(sample, /\b(com|para|obra|instalacao|instalacao|projecto|companhia|musica|som|ao|da|do|uma|foi|em)\b/gu) +
    countMatches(sample, /[ãáàçõéêíóôú]/gu)
  const enHits = countMatches(
    sample,
    /\b(the|with|for|project|installation|music|sound|live|made|performed|during|show)\b/gu,
  )
  return ptHits >= enHits ? "pt" : "en"
}

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0
}

function parseHtml(html: string): Document | null {
  if (typeof DOMParser === "undefined") return null
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
}

function isMediaElement(el: Element): boolean {
  return (
    el.tagName === "FIGURE" ||
    el.tagName === "IMG" ||
    el.tagName === "IFRAME" ||
    el.querySelector("img, iframe") !== null
  )
}

function textFromElement(el: Element): string {
  if (el.tagName === "UL" || el.tagName === "OL") {
    return cleanText(
      Array.from(el.querySelectorAll("li"))
        .map((li) => li.textContent ?? "")
        .join("\n"),
    )
  }
  return cleanText(el.textContent ?? "")
}

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/gu, "\n")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n\n")
    .replace(/<\/(div|figure|h[1-6])>/giu, "\n\n")
    .replace(/<\/li>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
}

function splitPlainBlocks(text: string): string[] {
  return decodeEntities(text)
    .split(/\n{2,}/u)
    .map((block) => cleanText(block))
    .filter(Boolean)
}

function decodeEntities(text: string): string {
  if (typeof document === "undefined") {
    return text
      .replace(/&nbsp;/giu, " ")
      .replace(/&amp;/giu, "&")
      .replace(/&quot;/giu, '"')
  }
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

function cleanText(text: string): string {
  return decodeEntities(text)
    .replace(/\u00a0/gu, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim()
}

function normalizeDisplayLabel(value: string): string {
  const cleaned = cleanText(value)
  if (!cleaned) return ""
  if (ENTITY_NAME_MAP.has(normalizeComparable(cleaned))) {
    return ENTITY_NAME_MAP.get(normalizeComparable(cleaned)) ?? cleaned
  }
  if (/[A-ZÀ-ÖØ-Þ]/u.test(cleaned) && /[a-zà-öø-ÿ]/u.test(cleaned)) {
    return cleaned
  }
  return cleaned
    .toLowerCase()
    .split(/\s+/u)
    .map((word) =>
      ["de", "da", "do", "dos", "das", "and", "of", "the"].includes(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ")
}

function normalizeEntityName(value: string): string | null {
  const cleaned = normalizeDisplayLabel(value)
    .replace(/[.;]+$/u, "")
    .trim()
  if (!cleaned || isNA(cleaned)) return null
  return ENTITY_NAME_MAP.get(normalizeComparable(cleaned)) ?? cleaned
}

function normalizeCity(value: string | null): string | null {
  if (!value) return null
  const comparable = normalizeComparable(value)
  return CITY_MAP.get(comparable) ?? normalizeDisplayLabel(value)
}

function normalizeRegion(value: string | null): string | null {
  if (!value) return null
  const comparable = normalizeComparable(value)
  return REGION_MAP.get(comparable) ?? normalizeDisplayLabel(value)
}

function normalizeCountry(value: string | null): string | null {
  if (!value) return null
  const comparable = normalizeComparable(value)
  return COUNTRY_MAP.get(comparable) ?? null
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

function sameComparable(a: string, b: string): boolean {
  return normalizeComparable(a) === normalizeComparable(b)
}

function normalizeKey(value: string): string {
  return normalizeComparable(value).replace(/\s+/gu, " ")
}

function normalizeForSearch(value: string): string {
  return normalizeComparable(stripHtml(value))
}

function slugify(value: string): string {
  return normalizeComparable(value).replace(/\s+/gu, "-")
}

function isOrganizationName(name: string): boolean {
  return /team|studio|companhia|collective|festival|centre|center|ccc\.cr|ocubo|alta|how|datagrama|blakat/iu.test(
    name,
  )
}

function isNA(value: string): boolean {
  const comparable = normalizeComparable(value)
  return comparable === "n a" || comparable === "na"
}
