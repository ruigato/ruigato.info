#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { extractFlickrRefsFromHtml } from "./extract-flickr-refs.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const worksPath = path.join(root, "src/data/works.json")
const flickrManifestPath = path.join(root, "src/data/flickr-galleries.json")
const overridesPath = path.join(root, "src/data/worksCanonicalOverrides.json")
const textTranslationsDir = path.join(root, "src/data/worksTextTranslations")
const canonicalOutPath = path.join(root, "src/data/worksCanonical.json")
const reviewOutPath = path.join(root, "src/data/worksCanonicalReview.json")
const publicCanonicalDir = path.join(root, "public/data/canonical")
const publicDetailsDir = path.join(publicCanonicalDir, "works")
const publicIndexPath = path.join(publicCanonicalDir, "works-index.json")
const publicLegacyWpMediaDir = path.join(root, "public/media/wp-content")
const legacyWpContentDir = process.env.LEGACY_WP_CONTENT_DIR?.trim()
  ? path.resolve(process.env.LEGACY_WP_CONTENT_DIR.trim())
  : "C:\\xampp\\htdocs\\ruigato\\wp-content"
const LEGACY_WP_URL_PREFIX_EXACT_RE = /^https?:\/\/(?:www\.)?ruigato\.info\/wp-content\//iu
const LEGACY_WP_URL_PREFIX_IN_TEXT_RE = /https?:\/\/(?:www\.)?ruigato\.info\/wp-content\//giu
const LOCAL_LEGACY_WP_URL_PREFIX = "/media/wp-content/"

const ENTITY_NAME_MAP = new Map([
  ["ocubo", "OCUBO"],
  ["alta", "ALTA"],
  ["how", "HOW"],
  ["horse on wheels", "HOW"],
  ["ccc cr", "CCC.CR"],
  ["ccc.cr", "CCC.CR"],
  ["jgm", "Companhia João Garcia Miguel"],
  ["companhia joao garcia miguel", "Companhia João Garcia Miguel"],
  ["joao garcia miguel", "João Garcia Miguel"],
  ["joão garcia miguel", "João Garcia Miguel"],
  ["datagrama", "Datagrama"],
  ["blakat", "Blakat"],
  ["fundacao edp", "Fundação EDP"],
  ["fundação edp", "Fundação EDP"],
])

const CITY_MAP = new Map([
  ["lisboa", "Lisbon"],
  ["porto", "Porto"],
  ["berlim", "Berlin"],
  ["veneza", "Venice"],
  ["venezia", "Venice"],
  ["madrid", "Madrid"],
  ["sao paulo", "Sao Paulo"],
  ["são paulo", "Sao Paulo"],
  ["rio de janeiro", "Rio de Janeiro"],
  ["bilbau", "Bilbao"],
  ["ilhavo", "Ilhavo"],
  ["ílhavo", "Ilhavo"],
  ["caldas da rainha", "Caldas da Rainha"],
  ["torres vedras", "Torres Vedras"],
  ["idanha a nova", "Idanha-a-Nova"],
  ["idanha-a-nova", "Idanha-a-Nova"],
  ["aveiro", "Aveiro"],
  ["ericeira", "Ericeira"],
  ["arraiolos", "Arraiolos"],
  ["doha", "Doha"],
  ["live oak", "Live Oak"],
  ["leiria", "Leiria"],
  ["braga", "Braga"],
  ["cascais", "Cascais"],
  ["elvas", "Elvas"],
  ["mafra", "Mafra"],
])

const REGION_MAP = new Map([
  ["florida", "Florida"],
  ["asturias", "Asturias"],
])

const COUNTRY_MAP = new Map([
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
])

const UMBRELLA_RULES = [
  {
    name: "HOW",
    kind: "studio",
    match(ctx) {
      if (ctx.tags.has("HOW")) return "high"
      if (/horse on wheels/.test(ctx.combinedText)) return "high"
      if (ctx.placeComparable === "how") return "high"
      if (
        (ctx.tags.has("3D") ||
          ctx.tags.has("motion graphics") ||
          ctx.categories.has("motion graphics")) &&
        /(post production|pós produção|television|tv|video)/.test(ctx.combinedText)
      ) {
        return "medium"
      }
      return null
    },
  },
  {
    name: "Companhia João Garcia Miguel",
    kind: "company",
    match(ctx) {
      if (
        /companhia jo[aã]o garcia miguel|companhia jgm|artista membro/.test(
          ctx.combinedText,
        )
      ) {
        return "high"
      }
      if (ctx.clientComparable === "joao garcia miguel") return "high"
      if (
        /(jo[aã]o garcia miguel|jgm)/.test(ctx.combinedText) &&
        /(teatro|theatre|companhia|resid[eê]ncia|digress[aã]o|laborat[oó]rio)/.test(
          ctx.combinedText,
        )
      ) {
        return "medium"
      }
      return null
    },
  },
  {
    name: "OCUBO",
    kind: "company",
    match(ctx) {
      if (ctx.tags.has("OCUBO")) return "high"
      if (ctx.clientComparable === "ocubo") return "high"
      if (/(context of ocubo|ocubo and olab|olab work development)/.test(ctx.combinedText)) {
        return "high"
      }
      if (/ocubo/.test(ctx.combinedText)) return "medium"
      return null
    },
  },
  {
    name: "ALTA",
    kind: "company",
    match(ctx) {
      if (ctx.tags.has("ALTA")) return "high"
      if (/alta\.international/.test(ctx.combinedText)) return "high"
      if (ctx.collaborationComparables.includes("alta")) return "medium"
      if (
        /(design experiencial|experiential design|videomapping comercial|commercial videomapping)/.test(
          ctx.combinedText,
        )
      ) {
        return "medium"
      }
      return null
    },
  },
  {
    name: "Blakat",
    kind: "collective",
    match(ctx) {
      if (ctx.tags.has("blakat")) return "high"
      if (/blakat/.test(ctx.combinedText)) return "medium"
      return null
    },
  },
  {
    name: "Datagrama",
    kind: "collective",
    match(ctx) {
      if (ctx.tags.has("datagrama")) return "high"
      if (/datagrama/.test(ctx.combinedText)) return "medium"
      return null
    },
  },
]

function main() {
  const works = readJson(worksPath)
  const flickrManifest = fs.existsSync(flickrManifestPath)
    ? readJson(flickrManifestPath)
    : {}
  const overrides = fs.existsSync(overridesPath) ? readJson(overridesPath) : {}
  const textTranslations = readTranslationOverrides(textTranslationsDir)

  const canonicalWorks = works.map((work) =>
    canonicalizeWork(
      work,
      flickrManifest,
      overrides[work.slug] ?? {},
      textTranslations[work.slug] ?? {},
    ),
  )
  const reviewQueue = canonicalWorks
    .filter((work) => work.review_flags.length > 0)
    .map((work) => ({
      slug: work.slug,
      title: work.title,
      review_flags: work.review_flags,
      umbrella_entity_candidate: work.umbrella_entity,
      umbrella_entity_confidence: work.umbrella_entity_confidence,
      source_signals: work._migration_debug?.umbrella_signals ?? [],
      categories: work.categories,
      tags: work.tags,
      client: work.client?.name ?? null,
    }))

  writeJson(canonicalOutPath, canonicalWorks)
  writeJson(reviewOutPath, reviewQueue)
  writeSplitCanonicalOutputs(canonicalWorks)
  const mediaSync = syncReferencedLegacyWpMedia(canonicalWorks)

  console.log(`Canonical works: ${canonicalWorks.length}`)
  console.log(`Review queue: ${reviewQueue.length}`)
  console.log(`Wrote: ${path.relative(root, canonicalOutPath)}`)
  console.log(`Wrote: ${path.relative(root, reviewOutPath)}`)
  console.log(`Wrote: ${path.relative(root, publicIndexPath)}`)
  console.log(
    `Synced legacy WP media: ${mediaSync.copied} copied, ${mediaSync.missing} missing`,
  )
  if (mediaSync.missingRefs.length > 0) {
    console.warn("Missing legacy WP media:")
    for (const ref of mediaSync.missingRefs.slice(0, 20)) {
      console.warn(`- ${ref}`)
    }
  }
}

function canonicalizeWork(work, flickrManifest, override, textOverride) {
  const bodyHtml = rewriteLegacyWpMediaUrlsInHtml(work.bodyHtml ?? "")
  const summary = work.summary ?? ""
  const blocks = collectBlocks(bodyHtml)
  const bodyMeta = parseMeta(blocks)
  const summaryMeta = parseMeta(splitPlainBlocks(summary))
  const meta = { ...summaryMeta, ...bodyMeta }

  const titleFromMeta = meta.name ?? null
  const chosenTitle = override.title ?? work.title
  const titleConflict =
    !Object.hasOwn(override, "title") &&
    titleFromMeta &&
    comparable(titleFromMeta) !== comparable(work.title)

  const venue = buildVenue(meta)
  const descriptions = extractDescriptions(bodyHtml)
  const cleanedSummary = buildSummary(summary, descriptions)
  const finalDescriptions = pruneDescriptions(descriptions, cleanedSummary)
  const localizedSummary = buildLocalizedSummary(
    cleanedSummary,
    textOverride.summary_localized ?? null,
  )
  const translatedDescriptions = applyDescriptionOverrides(
    finalDescriptions,
    textOverride.description_localized ?? null,
  )
  const links = extractLinks(bodyHtml, summary)
  const credits = extractCredits(bodyHtml, summary, meta)
  const media = extractMedia(work, bodyHtml, flickrManifest)
  const featuredMedia = resolveFeaturedMedia(work, media)
  const publishedAt = override.published_at ?? work.date ?? meta.date ?? null
  const occurredOn = override.occurred_on ?? meta.date ?? work.date ?? null
  const reviewFlags = []

  if (titleConflict) reviewFlags.push("manual_title_conflict")
  if (work.date && meta.date && work.date !== meta.date) {
    reviewFlags.push("manual_date_conflict")
  }
  if ((work.categories ?? []).length > 1) {
    reviewFlags.push("manual_primary_category")
  }

  const client = entityRef(meta.client, "client")
  const umbrellaInference = inferUmbrellaEntity({
    title: work.title,
    summary,
    bodyHtml,
    meta,
    tags: new Set(work.tags ?? []),
    categories: new Set(work.categories ?? []),
    credits,
    client,
    venue,
    links,
  })
  if (umbrellaInference.confidence === "low") {
    reviewFlags.push("manual_umbrella_entity")
  }

  const primaryCategory =
    override.primary_category ??
    ((work.categories ?? []).length === 1 ? work.categories[0] : null)

  return {
    id: String(work.wpId ?? work.slug),
    slug: work.slug,
    title: chosenTitle,
    published_at: publishedAt,
    occurred_on: occurredOn,
    event_name: meta.event ?? null,
    summary: cleanedSummary,
    summary_localized: localizedSummary,
    body_html: bodyHtml || null,
    legacy_wp_id: work.wpId ?? null,
    venue,
    client,
    umbrella_entity:
      Object.hasOwn(override, "umbrella_entity")
        ? override.umbrella_entity
        : umbrellaInference.entity,
    umbrella_entity_confidence:
      Object.hasOwn(override, "umbrella_entity")
        ? null
        : umbrellaInference.confidence,
    featured_media: featuredMedia,
    iteration_of_work_id: inferIterationOfWorkId(work),
    primary_category: primaryCategory,
    categories: work.categories ?? [],
    tags: work.tags ?? [],
    credits,
    links,
    descriptions: translatedDescriptions,
    quotes: extractQuotes(bodyHtml, summary),
    media,
    review_flags: reviewFlags.filter((flag) => {
      if (flag === "manual_title_conflict" && Object.hasOwn(override, "title")) {
        return false
      }
      if (
        flag === "manual_primary_category" &&
        Object.hasOwn(override, "primary_category")
      ) {
        return false
      }
      if (
        flag === "manual_umbrella_entity" &&
        Object.hasOwn(override, "umbrella_entity")
      ) {
        return false
      }
      if (flag === "manual_date_conflict" && Object.hasOwn(override, "occurred_on")) {
        return false
      }
      return true
    }),
    _migration_debug: {
      meta_name: titleFromMeta,
      umbrella_signals: umbrellaInference.signals,
    },
  }
}

function writeSplitCanonicalOutputs(canonicalWorks) {
  fs.mkdirSync(publicCanonicalDir, { recursive: true })
  fs.rmSync(publicDetailsDir, { recursive: true, force: true })
  fs.mkdirSync(publicDetailsDir, { recursive: true })

  const index = canonicalWorks.map((work) => makeIndexEntry(work))
  writeJson(publicIndexPath, index)

  for (const work of canonicalWorks) {
    writeJson(path.join(publicDetailsDir, `${work.slug}.json`), work)
  }
}

function buildLocalizedSummary(summary, override) {
  if (!summary && !override) return null
  return {
    pt: override?.pt ?? null,
    en: override?.en ?? null,
    ...(summary ? {} : {}),
  }
}

function applyDescriptionOverrides(descriptions, override) {
  if (!override) return descriptions
  const byLocale = new Map(
    descriptions.map((item) => [`${item.locale}:${item.kind}`, { ...item }]),
  )

  for (const locale of ["pt", "en"]) {
    const content = override[locale]
    if (!content) continue
    byLocale.set(`${locale}:description`, {
      locale,
      kind: "description",
      content,
    })
  }

  return [...byLocale.values()]
}

/** Thumbnail for list views: index payloads omit `media`, so this must be explicit. */
function indexFeaturedMediaFromCanonical(work) {
  if (work.featured_media) return work.featured_media
  const media = work.media ?? []
  const firstImage = media.find((m) => m.kind === "image")
  if (firstImage) return { ...firstImage }
  const gallery = media.find(
    (m) =>
      m.kind === "gallery" &&
      Array.isArray(m.gallery_items) &&
      m.gallery_items.length > 0,
  )
  if (gallery) {
    return {
      id: `${gallery.id ?? "gallery"}-index-thumb`,
      kind: "image",
      local_path: gallery.gallery_items[0],
      external_url: null,
      platform: gallery.platform ?? null,
      sort_order: 0,
    }
  }
  return null
}

function makeIndexEntry(work) {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    summary: work.summary,
    published_at: work.published_at,
    occurred_on: work.occurred_on,
    event_name: work.event_name,
    legacy_wp_id: work.legacy_wp_id,
    primary_category: work.primary_category,
    categories: work.categories,
    tags: work.tags,
    venue: work.venue,
    client: work.client,
    umbrella_entity: work.umbrella_entity,
    umbrella_entity_confidence: work.umbrella_entity_confidence,
    iteration_of_work_id: work.iteration_of_work_id,
    featured_media: indexFeaturedMediaFromCanonical(work),
    review_flags: work.review_flags,
  }
}

function syncReferencedLegacyWpMedia(canonicalWorks) {
  const refs = new Set()
  for (const work of canonicalWorks) {
    collectLegacyWpMediaRefs(work, refs)
  }

  let copied = 0
  let missing = 0
  const missingRefs = []
  for (const ref of refs) {
    const relative = ref.slice(LOCAL_LEGACY_WP_URL_PREFIX.length).replace(/\//g, path.sep)
    const srcPath = path.join(legacyWpContentDir, relative)
    const destPath = path.join(publicLegacyWpMediaDir, relative)
    if (!fs.existsSync(srcPath)) {
      missing++
      missingRefs.push(ref)
      continue
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)
    copied++
  }

  return { copied, missing, missingRefs }
}

function collectLegacyWpMediaRefs(value, out) {
  if (typeof value === "string") {
    if (value.startsWith(LOCAL_LEGACY_WP_URL_PREFIX)) {
      out.add(value)
    }
    for (const match of value.matchAll(/\/media\/wp-content\/[^"')\s<]+/giu)) {
      out.add(match[0])
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectLegacyWpMediaRefs(item, out)
    return
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectLegacyWpMediaRefs(nested, out)
  }
}

function buildVenue(meta) {
  const rawLocation = meta.location ?? null
  let venueName = null
  let city = null
  let regionOrState = null
  let country = null

  if (meta.location) {
    const locationParts = splitCsv(meta.location)
    if (locationParts.length >= 2) {
      venueName = normalizeVenueName(locationParts[0], null)
      ;({ city, regionOrState, country } = normalizeGeoParts(locationParts.slice(1)))
    } else {
      venueName = normalizeVenueName(meta.location, null)
    }
  }

  if (meta.city) {
    const geo = normalizeGeoParts(splitCsv(meta.city))
    city = geo.city ?? city
    regionOrState = geo.regionOrState ?? regionOrState
    country = geo.country ?? country
  }

  if (meta.place) {
    const candidate = normalizeVenueName(meta.place, city)
    if (candidate) {
      venueName = venueName ?? candidate
    }
  }

  if (!venueName && !city && !regionOrState && !country && !rawLocation) {
    return null
  }

  return {
    venue_name: venueName,
    city,
    region_or_state: regionOrState,
    country,
    raw_location: rawLocation ?? meta.city ?? meta.place ?? null,
  }
}

function extractDescriptions(bodyHtml) {
  const descriptions = []
  const byLocale = {
    en: extractDescriptionByLocale(bodyHtml, "EN"),
    pt: extractDescriptionByLocale(bodyHtml, "PT"),
  }

  if (!byLocale.en && !byLocale.pt) {
    const narrative = extractNarrativeFallback(bodyHtml)
    if (narrative) {
      byLocale[detectLocale(narrative)] = narrative
    }
  }

  if (byLocale.en) {
    descriptions.push({
      locale: "en",
      kind: "description",
      content: byLocale.en,
    })
  }
  if (byLocale.pt) {
    descriptions.push({
      locale: "pt",
      kind: "description",
      content: byLocale.pt,
    })
  }

  if (!byLocale.en && byLocale.pt) {
    descriptions.push({
      locale: "en",
      kind: "description",
      content: byLocale.pt,
      generated_from_locale: "pt",
    })
  }
  if (!byLocale.pt && byLocale.en) {
    descriptions.push({
      locale: "pt",
      kind: "description",
      content: byLocale.en,
      generated_from_locale: "en",
    })
  }

  return descriptions
}

function extractDescriptionByLocale(bodyHtml, locale) {
  const marker = new RegExp(
    `<(?:p|h2|h3)[^>]*>\\s*(?:<[^>]+>\\s*)*description\\s+${locale}\\s*:?(?:\\s*<\\/[^>]+>)?\\s*<\\/(?:p|h2|h3)>`,
    "iu",
  )
  const match = marker.exec(bodyHtml)
  if (!match) {
    const inline = new RegExp(`description\\s+${locale}\\s*:\\s*([^<]+)`, "iu").exec(bodyHtml)
    return inline ? cleanText(stripHtml(inline[1])) : null
  }
  const after = bodyHtml.slice(match.index + match[0].length)
  const paragraphs = collectBlocks(after)
    .filter((block) => !/^(description\s+(EN|PT)|links|team|special thanks to|agradecimentos)\s*:?/iu.test(block))
  return cleanText(paragraphs.slice(0, 6).join("\n\n")) || null
}

function extractQuotes(bodyHtml, summary) {
  const out = []
  for (const block of [...collectBlocks(bodyHtml), ...splitPlainBlocks(summary)]) {
    const trimmed = cleanText(block)
    if (!trimmed) continue
    if (!/^["“]/u.test(trimmed)) continue
    out.push({
      locale: detectLocale(trimmed),
      content: trimmed.replace(/^["“]|["”]$/gu, ""),
      source_label: null,
      source_url: null,
    })
  }
  return dedupeBy(out, (item) => `${item.locale}:${comparable(item.content)}`)
}

function buildSummary(summary, descriptions) {
  const cleaned = splitPlainBlocks(summary)
    .filter((block) => !/^https?:\/\//iu.test(block))
    .filter((block) => !/^(team|special thanks to|agradecimentos|links)\s*:?/iu.test(block))
    .join(" ")
  const summaryText = cleanText(cleaned)
  const description = pickPreferredDescription(descriptions)

  if (!summaryText) {
    return description ? summarizeText(description.content) : null
  }

  if (!description) {
    return isShortSummary(summaryText) ? summaryText : summarizeText(summaryText)
  }

  if (isDuplicateText(summaryText, description.content)) {
    return summarizeText(description.content)
  }

  if (isShortSummary(summaryText)) {
    return summaryText
  }

  return summarizeText(description.content)
}

function extractCredits(bodyHtml, summary, meta) {
  const credits = []

  if (meta.collaboration && !isNA(meta.collaboration)) {
    for (const credit of parseNameList(meta.collaboration, "collaboration")) {
      credits.push(credit)
    }
  }

  for (const block of splitPlainBlocks(summary)) {
    if (/^team\s*:/iu.test(block)) {
      const rest = block.replace(/^team\s*:/iu, "")
      credits.push(...extractTechnicalCredits(rest))
    }
    if (/^(special thanks to|agradecimentos)\s*:/iu.test(block)) {
      const rest = block.replace(/^(special thanks to|agradecimentos)\s*:/iu, "")
      credits.push(...parseNameList(rest, "special_thanks"))
    }
  }

  for (const block of collectBlocks(bodyHtml)) {
    if (/^photo by\s*:/iu.test(block)) {
      credits.push(...parseNameList(block.replace(/^photo by\s*:/iu, ""), "photography"))
    } else if (/^fotos de /iu.test(block)) {
      credits.push(...parseNameList(block.replace(/^fotos de /iu, ""), "photography"))
    } else if (
      /^(art direction|music|coding|videomapping|light design|concept)\s*:/iu.test(block)
    ) {
      credits.push(...extractTechnicalCredits(block))
    } else if (/^(special thanks to|agradecimentos)\s*:/iu.test(block)) {
      credits.push(...parseNameList(block.replace(/^(special thanks to|agradecimentos)\s*:/iu, ""), "special_thanks"))
    } else if (/^team\s*:/iu.test(block)) {
      credits.push(...extractTechnicalCredits(block.replace(/^team\s*:/iu, "")))
    }
  }

  return dedupeBy(credits, (item) => `${item.role}:${comparable(item.name)}`).map(
    (item, index) => ({
      ...item,
      sort_order: index,
    }),
  )
}

function extractTechnicalCredits(text) {
  const lines = cleanText(text).split(/\n+/u)
  const out = []
  for (const line of lines) {
    const byMatch = line.match(/^(.+?)\s+by\s+(.+)$/iu)
    if (byMatch) {
      const role = normalizeRole(byMatch[1])
      out.push(...parseNameList(byMatch[2], role))
      continue
    }
    const roleMatch = line.match(/^(art direction|music|coding|videomapping|light design|concept|tech installation)\s*:\s*(.+)$/iu)
    if (roleMatch) {
      out.push(...parseNameList(roleMatch[2], normalizeRole(roleMatch[1])))
      continue
    }
    if (line) {
      out.push(...parseNameList(line, "team"))
    }
  }
  return out
}

function parseNameList(value, role) {
  return splitNames(value).map((name) => ({
    role,
    name,
    is_organization: isOrganization(name),
  }))
}

function splitNames(value) {
  return cleanText(value)
    .replace(/\s+and\s+/giu, ",")
    .replace(/\s+e\s+/giu, ",")
    .replace(/\s+\/\s+/gu, ",")
    .split(",")
    .map((part) => normalizeEntityName(part))
    .filter(Boolean)
}

function extractLinks(bodyHtml, summary) {
  const candidates = [
    ...extractAnchorUrls(bodyHtml),
    ...matchUrls(summary),
  ].filter((url) => !detectMediaKind(url))

  return dedupeBy(candidates, (url) => url).map((url, index) => ({
    id: `link-${index + 1}`,
    label: url,
    url,
    kind: "external",
    preview_title: null,
    preview_description: null,
    preview_image: null,
  }))
}

function extractMedia(work, bodyHtml, flickrManifest) {
  const media = []
  const seen = new Set()

  const add = (item) => {
    const key = `${item.kind}:${item.local_path ?? item.external_url ?? ""}`
    if (!key || seen.has(key)) return
    seen.add(key)
    media.push({ id: `media-${media.length + 1}`, sort_order: media.length, ...item })
  }

  if (work.featuredImage) {
    add({
      kind: "image",
      local_path: normalizeLegacyWpMediaUrl(work.featuredImage),
      external_url: null,
      platform: null,
    })
  }
  if (work.featuredImageThumb && work.featuredImageThumb !== work.featuredImage) {
    add({
      kind: "image",
      local_path: normalizeLegacyWpMediaUrl(work.featuredImageThumb),
      external_url: null,
      platform: null,
    })
  }

  for (const match of bodyHtml.matchAll(/<img\b[^>]*src="([^"]+)"/giu)) {
    add({
      kind: "image",
      local_path: normalizeLegacyWpMediaUrl(match[1]),
      external_url: null,
      platform: null,
    })
  }

  for (const ref of extractFlickrRefsFromHtml(bodyHtml)) {
    const gallery = flickrManifest[ref.setId]?.photos ?? []
    if (gallery.length > 0) {
      add({
        kind: "gallery",
        local_path: gallery[0],
        gallery_items: gallery,
        external_url: null,
        platform: "flickr_migrated",
      })
    }
  }

  for (const url of matchUrls(bodyHtml)) {
    const mediaKind = detectMediaKind(url)
    if (!mediaKind) continue
    add({
      kind: mediaKind.kind,
      local_path: null,
      external_url: url,
      platform: mediaKind.platform,
    })
  }

  for (const match of bodyHtml.matchAll(/<iframe\b[^>]*src="([^"]+)"/giu)) {
    const mediaKind = detectMediaKind(match[1])
    if (!mediaKind) continue
    add({
      kind: mediaKind.kind,
      local_path: null,
      external_url: match[1],
      platform: mediaKind.platform,
    })
  }

  return media
}

function resolveFeaturedMedia(work, media) {
  const featuredImage = normalizeLegacyWpMediaUrl(work.featuredImage)
  const featuredImageThumb = normalizeLegacyWpMediaUrl(work.featuredImageThumb)
  if (work.featuredImage || work.featuredImageThumb) {
    const exact = media.find(
      (item) =>
        item.local_path === featuredImage || item.local_path === featuredImageThumb,
    )
    if (exact) return exact
  }
  return media.find((item) => item.kind === "image") ?? null
}

function inferUmbrellaEntity(ctx) {
  const combinedText = comparable(
    [ctx.title, ctx.summary, stripHtml(ctx.bodyHtml), ctx.meta.type ?? "", ctx.meta.event ?? ""]
      .filter(Boolean)
      .join(" "),
  )
  const collaborationComparables = ctx.credits
    .filter((credit) => credit.role === "collaboration")
    .map((credit) => comparable(credit.name))
  const runtimeCtx = {
    combinedText,
    clientComparable: comparable(ctx.client?.name ?? ""),
    placeComparable: comparable(ctx.venue?.venue_name ?? ""),
    tags: ctx.tags,
    categories: ctx.categories,
    collaborationComparables,
  }

  let lowCandidate = null
  const signals = []

  for (const rule of UMBRELLA_RULES) {
    const confidence = rule.match(runtimeCtx)
    if (!confidence) continue
    signals.push(`${rule.name}:${confidence}`)
    if (confidence === "high") {
      return {
        entity: entityRef(rule.name, rule.kind),
        confidence,
        signals,
      }
    }
    if (confidence === "medium" && !lowCandidate) {
      lowCandidate = {
        entity: entityRef(rule.name, rule.kind),
        confidence,
        signals: [...signals],
      }
    }
  }

  if (lowCandidate) return lowCandidate

  const mentions = UMBRELLA_RULES.filter((rule) =>
    combinedText.includes(comparable(rule.name)),
  )
  if (mentions.length === 1) {
    return {
      entity: entityRef(mentions[0].name, mentions[0].kind),
      confidence: "low",
      signals: [`${mentions[0].name}:mention`],
    }
  }

  return {
    entity: null,
    confidence: null,
    signals,
  }
}

function inferIterationOfWorkId(work) {
  const trimmed = work.title.trim()
  const base = trimmed
    .replace(/\s*@\s+.+$/u, "")
    .replace(/\s+\(v\d+\)$/iu, "")
    .replace(/\s+v\d+$/iu, "")
    .replace(/\s+#\d+$/u, "")
    .trim()
  return base !== trimmed ? slugify(base) : null
}

function parseMeta(blocks) {
  const meta = {}
  for (const block of blocks) {
    for (const line of cleanText(block).split(/\n+/u)) {
      const match = line.match(/^([^:]+):\s*(.+)$/u)
      if (!match) continue
      const key = comparable(match[1])
      if (
        key === "name" ||
        key === "date" ||
        key === "type" ||
        key === "event" ||
        key === "city" ||
        key === "place" ||
        key === "location" ||
        key === "client" ||
        key === "collaboration"
      ) {
        meta[key] = cleanText(match[2])
      }
    }
  }
  return meta
}

function collectBlocks(html) {
  const normal = html
    .replace(/<!--[\s\S]*?-->/gu, "\n")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n\n")
    .replace(/<\/(div|figure|h1|h2|h3|h4|h5|h6)>/giu, "\n\n")
    .replace(/<\/li>/giu, "\n")
    .replace(/<li\b[^>]*>/giu, "")
    .replace(/<[^>]+>/gu, "")
  return splitPlainBlocks(normal)
}

function extractNarrativeFallback(bodyHtml) {
  const blocks = collectBlocks(bodyHtml).filter(
    (block) =>
      !/^https?:\/\//iu.test(block) &&
      !/^(name|date|type|event|city|place|location|client|collaboration)\s*:/iu.test(
        block,
      ) &&
      !/^(description\s+(EN|PT)|links|team|special thanks to|agradecimentos)\s*:?/iu.test(
        block,
      ) &&
      !/^photo by\s*:/iu.test(block) &&
      !/^fotos de /iu.test(block) &&
      !/^["“]/u.test(block),
  )
  return cleanText(blocks.slice(0, 4).join("\n\n")) || null
}

function splitPlainBlocks(text) {
  return decodeHtml(text)
    .split(/\n{2,}/u)
    .map((block) => cleanText(block))
    .filter(Boolean)
}

function stripHtml(text) {
  return decodeHtml(
    text
      .replace(/<!--[\s\S]*?-->/gu, " ")
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<[^>]+>/gu, " "),
  )
}

function matchUrls(text) {
  return (text.match(/https?:\/\/[^\s"'<>)\]]+/giu) ?? []).map((url) =>
    url.replace(/&amp;/giu, "&").replace(/[),.]+$/u, ""),
  )
}

function extractAnchorUrls(html) {
  return [...html.matchAll(/href="([^"]+)"/giu)].map((match) =>
    match[1].replace(/&amp;/giu, "&"),
  )
}

function detectMediaKind(url) {
  if (/youtu\.be|youtube\.com/iu.test(url)) {
    return { kind: "video_embed", platform: "youtube" }
  }
  if (/vimeo\.com/iu.test(url)) {
    return { kind: "video_embed", platform: "vimeo" }
  }
  if (/soundcloud\.com/iu.test(url)) {
    return { kind: "audio_embed", platform: "soundcloud" }
  }
  return null
}

function normalizeLegacyWpMediaUrl(url) {
  if (!url) return url
  if (url.startsWith(LOCAL_LEGACY_WP_URL_PREFIX)) return url
  if (!LEGACY_WP_URL_PREFIX_EXACT_RE.test(url)) return url
  return url.replace(LEGACY_WP_URL_PREFIX_EXACT_RE, LOCAL_LEGACY_WP_URL_PREFIX)
}

function rewriteLegacyWpMediaUrlsInHtml(html) {
  if (!html) return html
  return html.replace(LEGACY_WP_URL_PREFIX_IN_TEXT_RE, LOCAL_LEGACY_WP_URL_PREFIX)
}

function entityRef(name, kind) {
  const normalized = normalizeEntityName(name)
  if (!normalized) return null
  return {
    id: slugify(normalized),
    name: normalized,
    slug: slugify(normalized),
    kind,
  }
}

function normalizeVenueName(value, city) {
  if (!value) return null
  const normalized = normalizeDisplayLabel(value)
  if (!normalized) return null
  return comparable(normalized) === comparable(city ?? "") ? null : normalized
}

function normalizeGeoParts(parts) {
  const cleanParts = parts.map((part) => cleanText(part)).filter(Boolean)
  const city = cleanParts[0] ? normalizeCity(cleanParts[0]) : null
  let regionOrState = null
  let country = null

  if (cleanParts[1]) {
    country = normalizeCountry(cleanParts[1])
    if (!country) {
      regionOrState = normalizeRegion(cleanParts[1])
    }
  }
  if (cleanParts[2]) {
    country = normalizeCountry(cleanParts[2]) ?? country
  }

  return { city, regionOrState, country }
}

function normalizeCity(value) {
  const key = comparable(value)
  return CITY_MAP.get(key) ?? normalizeDisplayLabel(value)
}

function normalizeRegion(value) {
  const key = comparable(value)
  return REGION_MAP.get(key) ?? normalizeDisplayLabel(value)
}

function normalizeCountry(value) {
  const key = comparable(value)
  return COUNTRY_MAP.get(key) ?? null
}

function normalizeDisplayLabel(value) {
  const clean = cleanText(value)
  if (!clean) return ""
  const key = comparable(clean)
  if (ENTITY_NAME_MAP.has(key)) return ENTITY_NAME_MAP.get(key)
  if (/[A-ZÀ-ÖØ-Þ]/u.test(clean) && /[a-zà-öø-ÿ]/u.test(clean)) return clean
  return clean
    .toLowerCase()
    .split(/\s+/u)
    .map((word) =>
      ["de", "da", "do", "dos", "das", "of", "the", "and"].includes(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ")
}

function normalizeEntityName(value) {
  const clean = normalizeDisplayLabel(value)
    .replace(/[.;]+$/u, "")
    .trim()
  if (!clean || isNA(clean)) return null
  const key = comparable(clean)
  return ENTITY_NAME_MAP.get(key) ?? clean
}

function normalizeRole(value) {
  return comparable(value).replace(/\s+/gu, "_")
}

function comparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

function slugify(value) {
  return comparable(value).replace(/\s+/gu, "-")
}

function detectLocale(text) {
  const sample = comparable(text)
  const ptHits =
    countMatches(sample, /\b(com|para|obra|instalacao|projecto|companhia|musica|som|uma|foi|em)\b/gu) +
    countMatches(String(text), /[ãáàçõéêíóôú]/gu)
  const enHits = countMatches(
    sample,
    /\b(the|with|for|project|installation|music|sound|live|made|performed|during|show)\b/gu,
  )
  return ptHits >= enHits ? "pt" : "en"
}

function countMatches(text, re) {
  return text.match(re)?.length ?? 0
}

function cleanText(text) {
  return decodeHtml(String(text ?? ""))
    .replace(/\u00a0/gu, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim()
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#8217;/giu, "'")
    .replace(/&#8220;/giu, '"')
    .replace(/&#8221;/giu, '"')
}

function trimSummary(text) {
  const clean = cleanText(text)
  if (clean.length <= 220) return clean
  const sentence = clean.match(/^(.+?[.!?])(?:\s|$)/u)?.[1]
  if (sentence && sentence.length <= 220) return sentence
  return clean.slice(0, 217).trimEnd() + "..."
}

function summarizeText(text) {
  const clean = cleanSummarySource(text)
  if (!clean) return null
  const sentence = clean.match(/^(.+?[.!?])(?:\s|$)/u)?.[1]
  if (sentence && sentence.length <= 180) {
    return sentence
  }
  if (clean.length <= 180) {
    return clean
  }
  return clean.slice(0, 177).trimEnd() + "..."
}

function pickPreferredDescription(descriptions) {
  const explicit = descriptions.find((item) => item.locale === "pt")
  if (explicit) return explicit
  return descriptions[0] ?? null
}

function isShortSummary(text) {
  const clean = cleanText(text)
  if (!clean) return false
  const lineCount = clean.split(/\n+/u).filter(Boolean).length
  return lineCount <= 2 || clean.length <= 180
}

function isDuplicateText(a, b) {
  const left = comparable(a)
  const right = comparable(b)
  if (!left || !right) return false
  return left === right || right.includes(left) || left.includes(right)
}

function pruneDescriptions(descriptions, summary) {
  return descriptions.filter((item) => {
    const content = cleanText(item.content)
    if (!content) return false
    if (isShortSummary(content)) return false
    if (summary && isNearDuplicateText(content, summary)) return false
    return true
  })
}

function cleanSummarySource(text) {
  return splitPlainBlocks(text)
    .filter((block) => !/^https?:\/\//iu.test(block))
    .join(" ")
    .replace(/https?:\/\/[^\s]+/giu, "")
    .trim()
}

function isNearDuplicateText(a, b) {
  const left = comparable(a)
  const right = comparable(b)
  if (!left || !right) return false
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = left.length > right.length ? left : right
  return longer.includes(shorter) && shorter.length / longer.length >= 0.8
}

function splitCsv(value) {
  return cleanText(value)
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean)
}

function dedupeBy(items, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const key = keyFn(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function isOrganization(value) {
  return /(studio|team|companhia|collective|festival|centre|center|ocubo|alta|how|datagrama|blakat|ccc\.cr|experimenta)/iu.test(
    value,
  )
}

function isNA(value) {
  const key = comparable(value)
  return key === "n a" || key === "na"
}

function readJson(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8")
}

function readTranslationOverrides(dirPath) {
  if (!fs.existsSync(dirPath)) return {}
  const files = fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))

  const merged = {}
  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    const data = JSON.parse(stripBom(fs.readFileSync(fullPath, "utf8")))
    for (const [slug, value] of Object.entries(data)) {
      merged[slug] = {
        ...(merged[slug] ?? {}),
        ...value,
        summary_localized: {
          ...(merged[slug]?.summary_localized ?? {}),
          ...(value.summary_localized ?? {}),
        },
        description_localized: {
          ...(merged[slug]?.description_localized ?? {}),
          ...(value.description_localized ?? {}),
        },
      }
    }
  }
  return merged
}

function stripBom(text) {
  return String(text).replace(/^\uFEFF/u, "")
}

main()
