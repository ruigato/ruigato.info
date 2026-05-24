#!/usr/bin/env node
/**
 * Descarrega fotos dos álbuns Flickr referenciados em works.json (Photonic + [flickr_set]),
 * grava em public/media/flickr/{photoset_id}/{photo_id}.jpg e actualiza src/data/flickr-galleries.json.
 *
 * Usa o feed público JSON do Flickr (sem API key). Se falhar (404, privado), tenta
 * FLICKR_API_KEY + flickr.photosets.getPhotos.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { collectFlickrRefsFromWorks } from "./extract-flickr-refs.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const worksPath = path.join(root, "src/data/works.json")
const outDir = path.join(root, "public/media/flickr")
const manifestPath = path.join(root, "src/data/flickr-galleries.json")

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function feedUrl(setId, userId) {
  const nsid = encodeURIComponent(userId)
  return `https://www.flickr.com/services/feeds/photoset.gne?set=${setId}&nsid=${nsid}&format=json&nojsoncallback=1`
}

function largeUrlFromFeedMedium(mediumUrl) {
  if (!mediumUrl || typeof mediumUrl !== "string") return mediumUrl
  return mediumUrl.replace(/_[a-z]\.jpg$/i, "_b.jpg")
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { redirect: "follow" })
    if (res.ok) return /** @type {any} */ (await res.json())
    if (res.status === 404) return null
    await sleep(1500 * (i + 1))
  }
  return null
}

/** @param {string} apiKey */
async function fetchViaApi(apiKey, setId, userId) {
  const u = new URL("https://api.flickr.com/services/rest/")
  u.searchParams.set("method", "flickr.photosets.getPhotos")
  u.searchParams.set("api_key", apiKey)
  u.searchParams.set("photoset_id", setId)
  u.searchParams.set("user_id", userId)
  u.searchParams.set("extras", "url_m,url_b")
  u.searchParams.set("format", "json")
  u.searchParams.set("nojsoncallback", "1")
  const res = await fetch(u.toString(), { redirect: "follow" })
  if (!res.ok) return []
  const data = /** @type {any} */ (await res.json())
  if (data.stat !== "ok" || !data.photoset?.photo) return []
  const photos = data.photoset.photo
  const list = Array.isArray(photos) ? photos : [photos]
  return list.map((p) => ({
    id: String(p.id),
    url: p.url_b || p.url_m || flickrConstruct(p),
  }))
}

function flickrConstruct(p) {
  if (!p.id || !p.secret) return ""
  const farm = p.farm ?? 2
  const server = p.server
  return `https://live.staticflickr.com/${server}/${p.id}_${p.secret}_b.jpg`
}

/**
 * @param {string} url
 * @param {string} dest
 */
async function downloadFile(url, dest) {
  const candidates = [
    url,
    url.replace(/_[a-z]\.jpg$/i, "_b.jpg"),
    url.replace(/_[a-z]\.jpg$/i, "_l.jpg"),
    url.replace(/_[a-z]\.jpg$/i, "_m.jpg"),
  ]
  const tried = new Set()
  for (const u of candidates) {
    if (tried.has(u)) continue
    tried.add(u)
    const res = await fetch(u, { redirect: "follow" })
    if (!res.ok) continue
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) continue
    fs.writeFileSync(dest, buf)
    return true
  }
  return false
}

async function main() {
  const works = JSON.parse(fs.readFileSync(worksPath, "utf8"))
  const refMap = collectFlickrRefsFromWorks(works)
  const apiKey = process.env.FLICKR_API_KEY?.trim() || ""

  console.log("Álbuns Flickr únicos:", refMap.size)

  fs.mkdirSync(outDir, { recursive: true })

  /** @type {Record<string, { userId: string, photos: string[] }>} */
  const manifest = {}

  let i = 0
  for (const [setId, userId] of refMap) {
    i++
    console.log(`[${i}/${refMap.size}] Álbum ${setId} …`)
    const setFolder = path.join(outDir, setId)
    fs.mkdirSync(setFolder, { recursive: true })

    let photoList = []

    const feed = await fetchJson(feedUrl(setId, userId))
    if (feed?.items?.length) {
      photoList = feed.items
        .map((it) => {
          const m = it.media?.m
          const id = it.link?.match(/\/photos\/[^/]+\/(\d+)\//)?.[1]
          if (!id || !m) return null
          return { id, url: largeUrlFromFeedMedium(m) }
        })
        .filter(Boolean)
    }

    if (!photoList.length && apiKey) {
      photoList = await fetchViaApi(apiKey, setId, userId)
      console.log("   (via API):", photoList.length, "fotos")
    }

    if (!photoList.length) {
      console.warn("   Aviso: sem fotos (privado ou ID inválido).")
      manifest[setId] = { userId, photos: [] }
      await sleep(400)
      continue
    }

    const publicPaths = []
    for (const { id, url } of photoList) {
      const dest = path.join(setFolder, `${id}.jpg`)
      if (!fs.existsSync(dest)) {
        const ok = await downloadFile(url, dest)
        if (!ok) console.warn("   Falha download", id, url)
        await sleep(350)
      }
      if (fs.existsSync(dest)) {
        publicPaths.push(`/media/flickr/${setId}/${id}.jpg`)
      }
    }

    manifest[setId] = { userId, photos: publicPaths }
    await sleep(500)
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8")
  console.log("Manifesto:", manifestPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
