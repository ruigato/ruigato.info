import { usePage } from "../hooks/usePage"
import { htmlForLocale, splitEnPtExportBody } from "../lib/localizedExportBody"
import { prepareLegacyBodyHtml } from "../lib/legacyHtml"
import { useSiteLocale } from "../context/SiteLocaleContext"
import type { LocaleCode } from "../types/content"

const UI = {
  en: {
    loading: "Loading…",
    loadError: "Could not load the page.",
    notFound: "Page not found in exported data.",
    aboutTitle: "About",
  },
  pt: {
    loading: "A carregar…",
    loadError: "Erro ao carregar a página.",
    notFound: "Página não encontrada nos dados exportados.",
    aboutTitle: "Sobre",
  },
} as const

function aboutHeading(pageTitle: string, locale: LocaleCode): string {
  const t = pageTitle.trim().toLowerCase()
  if (t === "about") {
    return UI[locale].aboutTitle
  }
  return pageTitle
}

function splitLeadImageHtml(html: string): {
  leadImageHtml: string | null
  bodyHtml: string
} {
  const trimmed = html.trim()
  const match =
    trimmed.match(
      /^(<(?:figure|img)\b[\s\S]*?(?:<\/figure>|>))(?:\s*(?:\n|\r\n?)*)?/iu,
    ) ?? null
  if (!match) {
    return { leadImageHtml: null, bodyHtml: html }
  }
  return {
    leadImageHtml: match[1] ?? null,
    bodyHtml: trimmed.slice(match[0].length).trimStart(),
  }
}

function normalizeAboutBodyHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ""
  if (/<p\b/i.test(trimmed)) {
    return trimmed
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const cls =
        index === 0
          ? "about-page__paragraph about-page__paragraph--lead"
          : "about-page__paragraph"
      return `<p class="${cls}">${chunk}</p>`
    })
    .join("\n")
}

export function AboutPage() {
  const { locale } = useSiteLocale()
  const ui = UI[locale]
  const { page, loading, error } = usePage("about")

  const bodyHtml =
    page?.bodyHtml != null
      ? prepareLegacyBodyHtml(
          htmlForLocale(splitEnPtExportBody(page.bodyHtml), locale),
        )
      : null
  const { leadImageHtml, bodyHtml: bodyContentHtml } = bodyHtml
    ? splitLeadImageHtml(bodyHtml)
    : { leadImageHtml: null, bodyHtml: "" }
  const normalizedBodyContentHtml = normalizeAboutBodyHtml(bodyContentHtml)

  if (loading) {
    return (
      <div className="page">
        <p>{ui.loading}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <p>{ui.loadError}</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="page">
        <h1>{ui.aboutTitle}</h1>
        <p>{ui.notFound}</p>
      </div>
    )
  }

  return (
    <div className="page work-detail about-page">
      <div className="about-page__intro">
        <div className="about-page__content">
          <h1 className="about-page__title">{aboutHeading(page.title, locale)}</h1>
          {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
          {normalizedBodyContentHtml ? (
            <div
              className="about-page__body work-body"
              dangerouslySetInnerHTML={{
                __html: normalizedBodyContentHtml,
              }}
            />
          ) : null}
        </div>
        {leadImageHtml ? (
          <div
            className="about-page__media"
            dangerouslySetInnerHTML={{ __html: leadImageHtml }}
          />
        ) : null}
      </div>
    </div>
  )
}
