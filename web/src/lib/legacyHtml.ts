const CANONICAL_ORIGINS = [
  "https://www.ruigato.info",
  "http://www.ruigato.info",
  "https://ruigato.info",
  "http://ruigato.info",
] as const

const TIMELINE_FALLBACK =
  '<aside class="wp-shortcode-fallback" role="note"><p>Conteúdo interactivo WordPress (timeline): usa a <a href="/timeline">página Timeline</a> deste site.</p></aside>'

const GRID_FALLBACK =
  '<aside class="wp-shortcode-fallback" role="note"><p>Grelha de obras WordPress: vê a <a href="/works">lista de obras</a>.</p></aside>'

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
 * Shortcodes → fallbacks, then optional media origin rewrite (`VITE_LEGACY_WP_ORIGIN`).
 */
export function prepareLegacyBodyHtml(html: string): string {
  return rewriteMediaOrigins(replaceWpShortcodes(html))
}

/** Para atributos `src` de imagens (obras, etc.). */
export function rewriteLegacyMediaUrl(url: string): string {
  return rewriteMediaOrigins(url)
}
