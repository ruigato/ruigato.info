import flickrManifest from "../data/flickr-galleries.json"

export type FlickrGalleryManifest = Record<
  string,
  { userId: string; photos: string[] }
>

const manifest = flickrManifest as FlickrGalleryManifest

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function galleryHtml(setId: string, userId: string, photos: string[]): string {
  if (!photos.length) {
    const flickrAlbum = `https://www.flickr.com/photos/${encodeURIComponent(userId)}/sets/${setId}/`
    return (
      `<aside class="work-flickr-missing" role="note">` +
      `<p>Galeria Flickr: álbum vazio ou indisponível. ` +
      `<a href="${escapeHtmlAttr(flickrAlbum)}" target="_blank" rel="noopener noreferrer">Ver no Flickr</a></p>` +
      `</aside>`
    )
  }

  const items = photos
    .map((src, index) => {
      const safe = escapeHtmlAttr(src)
      return (
        `<a href="${safe}" class="work-flickr-lightbox-trigger" data-flickr-index="${index}">` +
        `<img src="${safe}" alt="" loading="lazy" decoding="async" width="400" height="300" />` +
        `</a>`
      )
    })
    .join("")

  return (
    `<div class="work-flickr-gallery" data-flickr-set="${escapeHtmlAttr(setId)}" role="region" aria-label="Galeria de fotografias">` +
    `<div class="work-flickr-gallery__grid">${items}</div>` +
    `</div>`
  )
}

function photonicBlockToGallery(block: string): string {
  const setId =
    block.match(/"photoset_id"\s*:\s*"(\d+)"/)?.[1] ??
    block.match(/\\u0022photoset_id\\u0022:\\u0022(\d+)\\u0022/)?.[1]
  const userId =
    block.match(/"user_id"\s*:\s*"([^"]+)"/)?.[1] ??
    block.match(/\\u0022user_id\\u0022:\\u0022([^\\]+?)\\u0022/)?.[1]
  if (!setId || !userId) return ""
  const entry = manifest[setId]
  return galleryHtml(setId, userId, entry?.photos ?? [])
}

function flickrSetShortcodeToGallery(_full: string, setId: string): string {
  const DEFAULT_USER = "141356798@N05"
  const entry = manifest[setId]
  return galleryHtml(setId, entry?.userId ?? DEFAULT_USER, entry?.photos ?? [])
}

/** Remove restos de markup Photonic sem imagens. */
function stripPhotonicShells(html: string): string {
  let out = html
  out = out.replace(
    /<div\b[^>]*\bphotonic-flickr-stream\b[^>]*>[\s\S]*?<\/div>/gi,
    "",
  )
  out = out.replace(/<p>\s*<!--\s*\.photonic-stream[^]*?-->\s*<\/p>/gi, "")
  return out
}

/**
 * Substitui blocos Photonic / [flickr_set] por grelha local + URLs do manifest
 * (`flickr-galleries.json`, gerado por `node scripts/download-flickr-galleries.mjs`).
 */
export function replaceFlickrGalleriesWithLocal(html: string): string {
  let out = html
  out = out.replace(/<!--\s*wp:photonic\/gallery\s[\s\S]*?\/-->/g, (block) => {
    const g = photonicBlockToGallery(block)
    return g || ""
  })
  out = out.replace(
    /\[flickr_set\s+id\s*=\s*["'\u201c\u201d](\d+)["'\u201c\u201d]\s*\]/gi,
    flickrSetShortcodeToGallery,
  )
  out = stripPhotonicShells(out)
  return out
}
