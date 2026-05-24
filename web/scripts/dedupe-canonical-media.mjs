/**
 * Remove media duplicada nos JSON canónicos:
 * - mesma imagem (URL base WordPress, ignorando sufixo -WxH)
 * - mesmo vídeo (YouTube / Vimeo) com URLs diferentes
 * - URLs de galeria já presentes noutro item
 * - featured_media redundante (mesma imagem que já está em media[])
 *
 * Uso (pasta web/):
 *   node scripts/dedupe-canonical-media.mjs --dry-run
 *   node scripts/dedupe-canonical-media.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const worksDir = path.join(root, "public/data/canonical/works")
const indexPath = path.join(root, "public/data/canonical/works-index.json")
const canonicalArrayPath = path.join(root, "src/data/worksCanonical.json")
const dryRun = process.argv.includes("--dry-run")

function wpImageBaseKey(url) {
  try {
    const u = new URL(url)
    const base = u.pathname.replace(/-\d+x\d+(?=\.[^.]+)/iu, "")
    return `${u.origin}${base}`
  } catch {
    return String(url).split("?")[0]
  }
}

function imageUrlRank(url) {
  try {
    const pathname = new URL(url).pathname
    if (!/-\d+x\d+(?=\.[^.]+$)/iu.test(pathname)) return 1_000_000 + pathname.length
    const m = pathname.match(/-(\d+)x(\d+)(?=\.[^.]+$)/iu)
    return m ? Number(m[1]) * Number(m[2]) : 0
  } catch {
    return 0
  }
}

function videoKey(url) {
  const u = String(url).trim()
  if (/youtu\.be\//iu.test(u)) {
    const id = u.split(/youtu\.be\//iu)[1]?.split(/[?&#]/u)[0]
    return id ? `yt:${id}` : u
  }
  if (/youtube\.com\/embed\//iu.test(u)) {
    const id = u.split(/embed\//iu)[1]?.split(/[?&#/]/u)[0]
    return id ? `yt:${id}` : u
  }
  const m = u.match(/[?&]v=([\w-]{6,})/iu)
  if (m) return `yt:${m[1]}`
  const vimeo = u.match(/vimeo\.com\/(?:video\/|)(\d+)/iu)
  if (vimeo) return `vm:${vimeo[1]}`
  return u.split("?")[0]
}

function isVideoUrl(u) {
  return /youtube\.com|youtu\.be|vimeo\.com|player\.vimeo|soundcloud\.com/iu.test(String(u))
}

function collectImageKeysFromMedia(mediaArr) {
  const s = new Set()
  for (const m of mediaArr) {
    if (m.kind === "image") {
      const u = m.local_path ?? m.external_url
      if (u) s.add(wpImageBaseKey(String(u)))
    }
    if (m.kind === "gallery") {
      for (const url of m.gallery_items ?? []) {
        if (url) s.add(wpImageBaseKey(String(url)))
      }
    }
  }
  return s
}

/**
 * @returns {{ media: unknown[], featured_media: unknown | null | undefined, changed: boolean }}
 */
function dedupeWorkMedia(work) {
  const orig = JSON.stringify({ media: work.media, featured_media: work.featured_media })
  const usedImg = new Set()
  const imgKeyToIndex = new Map()
  const usedVid = new Set()
  const out = []

  for (const raw of work.media ?? []) {
    const item = { ...raw }

    if (item.kind === "gallery") {
      const gi = []
      for (const url of item.gallery_items ?? []) {
        const bk = wpImageBaseKey(String(url))
        if (usedImg.has(bk)) continue
        usedImg.add(bk)
        gi.push(url)
      }
      if (gi.length === 0) continue
      item.gallery_items = gi
      item.sort_order = out.length
      out.push(item)
      continue
    }

    if (item.kind === "image") {
      const u = item.local_path ?? item.external_url
      if (!u) {
        item.sort_order = out.length
        out.push(item)
        continue
      }
      const bk = wpImageBaseKey(String(u))
      if (!usedImg.has(bk)) {
        usedImg.add(bk)
        imgKeyToIndex.set(bk, out.length)
        item.sort_order = out.length
        out.push(item)
        continue
      }
      const idx = imgKeyToIndex.get(bk)
      const prev = out[idx]
      const pu = prev.local_path ?? prev.external_url ?? ""
      if (imageUrlRank(String(u)) > imageUrlRank(String(pu))) {
        out[idx] = {
          ...item,
          sort_order: idx,
          id: prev.id,
        }
      }
      continue
    }

    if (item.kind === "video_embed" || item.kind === "audio_embed") {
      const u = item.external_url ?? item.local_path
      if (!u) {
        item.sort_order = out.length
        out.push(item)
        continue
      }
      const vk = isVideoUrl(u) ? videoKey(String(u)) : `media:${String(u).split("?")[0]}`
      if (usedVid.has(vk)) continue
      usedVid.add(vk)
      item.sort_order = out.length
      out.push(item)
      continue
    }

    item.sort_order = out.length
    out.push(item)
  }

  out.forEach((m, i) => {
    m.sort_order = i
  })

  let nextFeatured = work.featured_media
  if (
    nextFeatured &&
    typeof nextFeatured === "object" &&
    nextFeatured.kind === "image"
  ) {
    const u = nextFeatured.local_path ?? nextFeatured.external_url
    if (u) {
      const bk = wpImageBaseKey(String(u))
      const keys = collectImageKeysFromMedia(out)
      if (keys.has(bk)) nextFeatured = null
    }
  }

  const changed =
    JSON.stringify({ media: out, featured_media: nextFeatured }) !== orig
  return { media: out, featured_media: nextFeatured, changed }
}

function processWorkFile(absPath) {
  const raw = fs.readFileSync(absPath, "utf8")
  const work = JSON.parse(raw)
  const { media, featured_media, changed } = dedupeWorkMedia(work)
  if (!changed) return null
  const next = { ...work, media, featured_media }
  const rel = path.relative(root, absPath)
  if (dryRun) {
    console.log(`[dry-run] ${rel}`)
    return next
  }
  fs.writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  console.log(`gravado: ${rel}`)
  return next
}

const changedBySlug = new Map()
for (const f of fs.readdirSync(worksDir).filter((x) => x.endsWith(".json"))) {
  const abs = path.join(worksDir, f)
  const updated = processWorkFile(abs)
  if (updated) changedBySlug.set(updated.slug, updated)
}

if (changedBySlug.size > 0 && fs.existsSync(indexPath)) {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"))
  let idxFeatUpdates = 0
  for (const entry of index) {
    const u = changedBySlug.get(entry.slug)
    if (!u) continue
    const nextFeat = u.featured_media ?? null
    if (JSON.stringify(entry.featured_media) !== JSON.stringify(nextFeat)) idxFeatUpdates++
  }
  if (!dryRun && idxFeatUpdates > 0) {
    for (const entry of index) {
      const u = changedBySlug.get(entry.slug)
      if (u) entry.featured_media = u.featured_media ?? null
    }
    fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8")
    console.log(
      `gravado: ${path.relative(root, indexPath)} (${idxFeatUpdates} entradas featured_media)`,
    )
  } else if (dryRun && idxFeatUpdates > 0) {
    console.log(`[dry-run] works-index.json (${idxFeatUpdates} featured_media)`)
  }
}

if (fs.existsSync(canonicalArrayPath)) {
  const arr = JSON.parse(fs.readFileSync(canonicalArrayPath, "utf8"))
  let n = 0
  for (let i = 0; i < arr.length; i++) {
    const { media, featured_media, changed } = dedupeWorkMedia(arr[i])
    if (!changed) continue
    n++
    if (!dryRun) arr[i] = { ...arr[i], media, featured_media }
  }
  if (n > 0 && !dryRun) {
    fs.writeFileSync(canonicalArrayPath, `${JSON.stringify(arr, null, 2)}\n`, "utf8")
    console.log(`gravado: ${path.relative(root, canonicalArrayPath)} (${n} obras)`)
  } else if (n > 0 && dryRun) {
    console.log(`[dry-run] worksCanonical.json (${n} obras)`)
  }
}

console.log(
  dryRun
    ? `--dry-run: ${changedBySlug.size} ficheiro(s) de obra alterariam.`
    : `Concluído: ${changedBySlug.size} ficheiro(s) de obra actualizados.`,
)
