import type { LocaleCode } from "../types/content"

export type LocalizedBodySplit =
  | { kind: "single"; html: string }
  | { kind: "en_pt"; shared: string; en: string; pt: string }

/**
 * Corpos exportados do WordPress com secções delimitadas por linhas `EN` e `PT`
 * (como em `pages.json` → about). Se o marcador não existir, devolve o HTML completo.
 */
export function splitEnPtExportBody(bodyHtml: string): LocalizedBodySplit {
  const enSep = /\n\nEN\n/
  const ptSep = /\n\nPT\n/
  if (!enSep.test(bodyHtml) || !ptSep.test(bodyHtml)) {
    return { kind: "single", html: bodyHtml }
  }
  const [beforeEn, afterEn] = bodyHtml.split(enSep)
  if (afterEn === undefined) {
    return { kind: "single", html: bodyHtml }
  }
  const [enPart, ptPart] = afterEn.split(ptSep)
  if (ptPart === undefined) {
    return { kind: "single", html: bodyHtml }
  }
  return { kind: "en_pt", shared: beforeEn, en: enPart, pt: ptPart }
}

export function htmlForLocale(
  split: LocalizedBodySplit,
  locale: LocaleCode,
): string {
  if (split.kind === "single") {
    return split.html
  }
  const shared = split.shared.trimEnd()
  const localized = (locale === "pt" ? split.pt : split.en).trimStart()
  if (!shared) return localized
  if (!localized) return shared
  return `${shared}\n\n${localized}`
}
