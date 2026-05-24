import { replaceFlickrGalleriesWithLocal } from "./flickrGalleries"
import { sanitizeWorkMediaExternalUrl } from "./mediaEmbedUrl"

const CANONICAL_ORIGINS = [
  "https://www.ruigato.info",
  "http://www.ruigato.info",
  "https://ruigato.info",
  "http://ruigato.info",
] as const

const TIMELINE_FALLBACK =
  '<aside class="wp-shortcode-fallback" role="note"><p>Conteúdo interactivo WordPress (timeline): abre a <a href="/">timeline</a> neste site.</p></aside>'

const GRID_FALLBACK =
  '<aside class="wp-shortcode-fallback" role="note"><p>Grelha de obras WordPress: vê a <a href="/works">lista de obras</a>.</p></aside>'

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function firstUrlInString(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s"'<>]+/i)
  if (!m) return null
  return m[0].replace(/&amp;/g, "&").replace(/[),.]+$/u, "")
}

/** Extrai o id do vídeo a partir de URLs youtube.com / youtu.be (export WordPress). */
function extractYouTubeVideoId(url: string): string | null {
  const cleaned = sanitizeWorkMediaExternalUrl(url) ?? ""
  const raw = (firstUrlInString(cleaned) ?? cleaned).trim().replace(/^\/\//, "https://")
  try {
    const parsed = new URL(raw)
    const h = parsed.hostname.replace(/^www\./i, "")
    if (h === "youtu.be") {
      const seg = parsed.pathname.split("/").filter(Boolean)[0]
      if (!seg) return null
      const id = seg.split("?")[0]
      return /^[\w-]{10,12}$/.test(id) ? id : null
    }
    if (h === "youtube.com" || h.endsWith(".youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2]?.split("?")[0]
        return id && /^[\w-]{10,12}$/.test(id) ? id : null
      }
      const v = parsed.searchParams.get("v")
      if (v && /^[\w-]{10,12}$/.test(v)) return v
    }
  } catch {
    return null
  }
  return null
}

/** Id numérico Vimeo (página ou player). */
function extractVimeoId(url: string): string | null {
  const cleaned = sanitizeWorkMediaExternalUrl(url) ?? ""
  const raw = (firstUrlInString(cleaned) ?? cleaned).trim().replace(/^\/\//, "https://")
  try {
    const parsed = new URL(raw)
    const h = parsed.hostname.replace(/^www\./i, "")
    if (h === "player.vimeo.com") {
      const m = parsed.pathname.match(/\/video\/(\d+)/)
      return m ? m[1] : null
    }
    if (h === "vimeo.com" || h.endsWith(".vimeo.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean)
      for (const p of parts) {
        if (/^\d+$/.test(p)) return p
      }
    }
  } catch {
    return null
  }
  return null
}

function isVideoUrl(url: string): boolean {
  return (
    extractYouTubeVideoId(url) !== null || extractVimeoId(url) !== null
  )
}

function videoEmbedHtml(url: string): string | null {
  const yt = extractYouTubeVideoId(url)
  if (yt) {
    const src = `https://www.youtube.com/embed/${escapeHtmlAttr(yt)}?rel=0`
    return (
      `<div class="work-body-embed work-body-embed--responsive">` +
      `<iframe src="${src}" title="YouTube video" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
      `allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
    )
  }
  const vm = extractVimeoId(url)
  if (vm) {
    const src = `https://player.vimeo.com/video/${escapeHtmlAttr(vm)}`
    return (
      `<div class="work-body-embed work-body-embed--responsive">` +
      `<iframe src="${src}" title="Vimeo video" ` +
      `allow="autoplay; fullscreen; picture-in-picture" ` +
      `allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
    )
  }
  return null
}

function replaceBracketEmbeds(html: string): string {
  /* WordPress: [embed]URL[/embed] ou [embed mce-style="width: 589px;"]URL[/embed] (TinyMCE) */
  /* Nota: em JS [^]]* não é “tudo menos ]” — é [^] + ]*; usar [^\]]* */
  return html.replace(
    /\[\s*embed\b[^\]]*\]\s*([\s\S]*?)\s*\[\s*\/\s*embed\s*\]/gi,
    (_, inner: string) => {
      const trimmed = inner.trim().replace(/&amp;/g, "&")
      const url = firstUrlInString(trimmed) ?? trimmed
      if (!url) return ""
      const embed = videoEmbedHtml(url)
      if (embed) return embed
      const safe = escapeHtmlAttr(url)
      return `<p><a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a></p>`
    },
  )
}

/** Blocos Gutenberg `wp:embed` cujo wrapper só contém um URL (YouTube/Vimeo). */
function replaceWpBlockVideoFigures(html: string): string {
  const re =
    /(?:<!--\s*wp:embed[^]*?-->\s*)?<figure\b[^>]*\bwp-block-embed\b[^>]*>[\s\S]*?<div class="wp-block-embed__wrapper">\s*(https?:\/\/[^\s<]+)\s*<\/div>[\s\S]*?<\/figure>\s*(?:<!--\s*\/wp:embed\s*-->)?/gi
  return html.replace(re, (full, rawUrl: string) => {
    const url = String(rawUrl).replace(/&amp;/g, "&")
    const embed = videoEmbedHtml(url)
    return embed ?? full
  })
}

/** Wrappers EmbedPress (export WP) com `data-url="embedpresss://vimeo.com/ID"` — remove o bloco e inject iframe. */
function replaceEmbedPressWrappers(html: string): string {
  const openRe =
    /<div\b[^>]*\bclass="[^"]*embedpress_wrapper[^"]*"[^>]*\bdata-url="embedpresss?:\/\/vimeo\.com\/(\d+)"[^>]*>/gi
  let result = html
  let guard = 0
  while (guard++ < 300) {
    openRe.lastIndex = 0
    const m = openRe.exec(result)
    if (!m || m.index === undefined) break
    const start = m.index
    const id = m[1]
    const afterOpen = start + m[0].length
    let depth = 1
    let i = afterOpen
    while (i < result.length && depth > 0) {
      const nextOpen = result.indexOf("<div", i)
      const nextClose = result.indexOf("</div>", i)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        i = nextOpen + 4
      } else {
        depth--
        i = nextClose + 6
      }
    }
    const embed = videoEmbedHtml(`https://vimeo.com/${id}`)
    if (!embed) break
    result = result.slice(0, start) + embed + result.slice(i)
  }
  return result
}

/** Remove `<a href="…youtube/vimeo…"></a>` vazios colados a um iframe que acabámos de injectar (evita duplicar). */
function dedupeEmptyVideoAnchorsNearEmbeds(html: string): string {
  return html
    .replace(
      /<a\b[^>]*href="https?:\/\/[^"]*(?:youtube\.com|youtu\.be|vimeo\.com)[^"]*"[^>]*>\s*<\/a>\s*(?=\s*<div class="work-body-embed)/gi,
      "",
    )
    .replace(
      /(<div class="work-body-embed[^>]*>[\s\S]*?<\/div>)\s*<a\b[^>]*href="https?:\/\/[^"]*(?:youtube\.com|youtu\.be|vimeo\.com)[^"]*"[^>]*>\s*<\/a>/gi,
      "$1",
    )
}

function stripInnerTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim()
}

/** `<a href="https://youtu…">https://youtu…</a>` ou âncora vazia com URL de vídeo → iframe. */
function replaceBareVideoAnchors(html: string): string {
  return html.replace(
    /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (full, hrefRaw: string, inner: string) => {
      let href = hrefRaw.replace(/&amp;/g, "&")
      const extracted = firstUrlInString(href)
      if (extracted) href = extracted
      if (!isVideoUrl(href)) return full
      const embed = videoEmbedHtml(href)
      if (!embed) return full
      const text = stripInnerTags(inner).replace(/\s+/g, " ").replace(/&amp;/g, "&")
      if (!text) return embed
      const hrefBase = href.split("?")[0].replace(/\/$/, "")
      const textBase = text.split("?")[0].replace(/\/$/, "")
      if (textBase !== hrefBase && !/^https?:\/\//i.test(text)) return full
      if (/^https?:\/\//i.test(text) && textBase !== hrefBase) return full
      return embed
    },
  )
}

function injectVideoEmbeds(html: string): string {
  let out = replaceBracketEmbeds(html)
  out = replaceWpBlockVideoFigures(out)
  out = replaceEmbedPressWrappers(out)
  out = dedupeEmptyVideoAnchorsNearEmbeds(out)
  out = replaceBareVideoAnchors(out)
  return out
}

/** Replace known WP shortcodes from exported HTML with static fallbacks + links. */
export function replaceWpShortcodes(html: string): string {
  let out = html
  out = out.replace(
    /\[\s*(?:webgl_timeline|interactive_timeline)\s*\]/gi,
    TIMELINE_FALLBACK,
  )
  out = out.replace(/\[the_grid[^\]]*\]/gi, GRID_FALLBACK)
  out = out.replace(/<!--\s*wp:shortcode\s*-->/gi, "")
  out = out.replace(/<!--\s*\/wp:shortcode\s*-->/gi, "")
  return out
}

function rewriteMediaOrigins(html: string): string {
  const raw = import.meta.env.VITE_LEGACY_WP_ORIGIN?.trim()
  if (!raw) return html

  const target = raw.replace(/\/$/, "")
  let out = html
  for (const origin of CANONICAL_ORIGINS) {
    const from = origin.replace(/\/$/, "")
    if (from !== target) {
      out = out.split(from).join(target)
    }
  }
  return out
}

/**
 * Shortcodes → fallbacks, YouTube/Vimeo → iframes responsivos, origem de media opcional.
 */
export function prepareLegacyBodyHtml(html: string): string {
  let out = html
  out = replaceWpShortcodes(out)
  out = injectVideoEmbeds(out)
  out = replaceFlickrGalleriesWithLocal(out)
  return rewriteMediaOrigins(out)
}

/** Para atributos `src` de imagens (obras, etc.). */
export function rewriteLegacyMediaUrl(url: string): string {
  return rewriteMediaOrigins(url)
}
