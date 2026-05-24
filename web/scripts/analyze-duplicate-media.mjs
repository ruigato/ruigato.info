/**
 * Analisa media[] nos JSON canónicos: mesma URL, thumb WP vs full, featured vs lista.
 * Uso: node scripts/analyze-duplicate-media.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, "../public/data/canonical/works")

/** Base de ficheiro WordPress (remove sufixo -WxH antes da extensão). */
function wpImageBaseKey(url) {
  try {
    const u = new URL(url)
    const base = u.pathname.replace(/-\d+x\d+(?=\.[^.]+)/iu, "")
    return `${u.origin}${base}`
  } catch {
    return url.split("?")[0]
  }
}

function videoKey(url) {
  const u = url.trim()
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
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/iu)
  if (vimeo) return `vm:${vimeo[1]}`
  return u.split("?")[0]
}

function mediaItemKeys(m) {
  const keys = []
  if (m.local_path) {
    const p = String(m.local_path)
    if (/youtube|youtu\.be|vimeo|soundcloud|\.mp4|\.webm/iu.test(p)) {
      keys.push(videoKey(p))
    } else if (/\.(jpe?g|png|webp|gif)(\?|$)/iu.test(p)) {
      keys.push(`img:${wpImageBaseKey(p)}`)
    } else {
      keys.push(`path:${p.split("?")[0]}`)
    }
  }
  if (m.external_url) {
    const p = String(m.external_url)
    if (/youtube|youtu\.be|vimeo|soundcloud/iu.test(p)) {
      keys.push(videoKey(p))
    } else {
      keys.push(`ext:${p.split("?")[0]}`)
    }
  }
  if (m.kind === "gallery" && Array.isArray(m.gallery_items)) {
    for (const g of m.gallery_items) {
      if (typeof g === "string" && g)
        keys.push(`img:${wpImageBaseKey(g)}`)
    }
  }
  return [...new Set(keys)]
}

function featuredKeys(fm) {
  if (!fm || typeof fm !== "object") return []
  return mediaItemKeys(fm)
}

const report = []
for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
  const slug = j.slug ?? file
  const media = j.media ?? []
  const seen = new Map()
  const internalDupes = []

  for (let i = 0; i < media.length; i++) {
    for (const k of mediaItemKeys(media[i])) {
      if (seen.has(k)) internalDupes.push({ key: k, at: i, first: seen.get(k) })
      else seen.set(k, i)
    }
  }

  const featKeys = featuredKeys(j.featured_media)
  const featOverlap = []
  for (const k of featKeys) {
    if (seen.has(k)) featOverlap.push({ key: k, mediaIndex: seen.get(k) })
  }

  if (internalDupes.length || featOverlap.length) {
    report.push({
      slug,
      internalDupes: internalDupes.length,
      featOverlap: featOverlap.length,
      samples: [...internalDupes, ...featOverlap.map((x) => ({ ...x, featured: true }))].slice(
        0,
        4,
      ),
    })
  }
}

report.sort((a, b) => b.internalDupes + b.featOverlap - (a.internalDupes + a.featOverlap))
console.log(JSON.stringify({ total: report.length, report: report.slice(0, 80) }, null, 2))
