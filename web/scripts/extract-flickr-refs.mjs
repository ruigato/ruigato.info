/**
 * Partilhado pelo script de download: extrair referências Flickr do HTML exportado.
 * @param {string} html
 * @returns {{ setId: string, userId: string }[]}
 */
export function extractFlickrRefsFromHtml(html) {
  const out = []
  const DEFAULT_USER = "141356798@N05"
  const photonic = /<!--\s*wp:photonic\/gallery\s[\s\S]*?\/-->/g
  let m
  while ((m = photonic.exec(html))) {
    const block = m[0]
    const sid =
      block.match(/"photoset_id"\s*:\s*"(\d+)"/)?.[1] ??
      block.match(/\\u0022photoset_id\\u0022:\\u0022(\d+)\\u0022/)?.[1]
    const uid =
      block.match(/"user_id"\s*:\s*"([^"]+)"/)?.[1] ??
      block.match(/\\u0022user_id\\u0022:\\u0022([^\\]+?)\\u0022/)?.[1]
    if (sid && uid) out.push({ setId: sid, userId: uid })
  }
  const br = /\[flickr_set\s+id\s*=\s*["'\u201c\u201d](\d+)["'\u201c\u201d]\s*\]/gi
  while ((m = br.exec(html))) {
    out.push({ setId: m[1], userId: DEFAULT_USER })
  }
  return out
}

export function collectFlickrRefsFromWorks(works) {
  const map = new Map()
  for (const w of works) {
    if (!w.bodyHtml) continue
    for (const r of extractFlickrRefsFromHtml(w.bodyHtml)) {
      if (!map.has(r.setId)) map.set(r.setId, r.userId)
    }
  }
  return map
}
