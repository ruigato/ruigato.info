#!/usr/bin/env node
/**
 * Fills `featured_media` on works-index.json when null, using each work's
 * detail JSON (first image, or first gallery frame). Needed for portfolio
 * cards: loadWorks() only receives the index, not per-work `media`.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const indexPath = path.join(root, "public/data/canonical/works-index.json")
const worksDir = path.join(root, "public/data/canonical/works")

function featuredMediaForList(work) {
  if (work.featured_media) return work.featured_media
  const media = work.media ?? []
  const firstImage = media.find((m) => m.kind === "image")
  if (firstImage) return { ...firstImage }
  const gallery = media.find(
    (m) => m.kind === "gallery" && Array.isArray(m.gallery_items) && m.gallery_items.length > 0,
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

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"))
let patched = 0
let missingFile = 0
for (const entry of index) {
  if (entry.featured_media) continue
  const detailPath = path.join(worksDir, `${entry.slug}.json`)
  if (!fs.existsSync(detailPath)) {
    missingFile++
    continue
  }
  const work = JSON.parse(fs.readFileSync(detailPath, "utf8"))
  const thumb = featuredMediaForList(work)
  if (thumb) {
    entry.featured_media = thumb
    patched++
  }
}
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8")
console.log(`works-index.json: set featured_media on ${patched} entries (${missingFile} detail files missing).`)
