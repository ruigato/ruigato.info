import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { useWork } from "../hooks/useWork"
import { useWorks } from "../hooks/useWorks"
import { prepareLegacyBodyHtml, rewriteLegacyMediaUrl } from "../lib/legacyHtml"
import { sanitizeWorkMediaExternalUrl } from "../lib/mediaEmbedUrl"
import { useSiteLocale } from "../context/SiteLocaleContext"
import { useWorkEditorAuth } from "../hooks/useWorkEditorAuth"
import { describeReviewFlag } from "../lib/editorialReview"
import type { CanonicalWork } from "../lib/canonicalWorks"
import { hydrateCanonicalWork } from "../lib/canonicalWorks"
import { fetchWorkCanonicalDraft } from "../lib/saveCanonicalWorkClient"
import { WorkEditorPanel } from "../components/WorkEditorPanel"
import { filterHighlightedWorks } from "../lib/highlightedWorks"
import {
  descriptionIsRedundantWithSummary,
  formatVenueLabel,
  getLocalizedSummary,
  getLocalizedText,
  groupCreditsByRole,
} from "../lib/workSchema"
import type { LocaleCode, Work, WorkMedia } from "../types/content"

const UI = {
  en: {
    loading: "Loading…",
    loadError: "Could not load the work.",
    notFound: "Work not found.",
    back: "← Works",
    published: "Published",
    occurred: "Occurred",
    event: "Event",
    location: "Location",
    client: "Client",
    context: "Context",
    categories: "Categories",
    tags: "Tags",
    summary: "Summary",
    description: "Description",
    programmeNotes: "Programme Notes",
    quotedText: "Quoted Text",
    credits: "Credits",
    media: "Media",
    links: "Links",
    review: "Editorial Review",
    close: "Close",
    previous: "← Previous",
    next: "Next →",
    lightbox: "Image viewer",
    editorLogin: "Editor login",
    editorLogout: "Sign out",
    editorPwd: "Password",
    editorSubmit: "Unlock",
    editorBadPwd: "Incorrect password.",
    editMode: "Edit this work",
    editModeOff: "Stop editing",
    editLoadingDraft: "Loading editable data…",
    editHydrateError: "Could not apply draft to preview:",
    previewNote: "Preview below reflects your edits.",
    adjacentNav: "Previous and next work",
    prevPost: "Previous",
    nextPost: "Next",
  },
  pt: {
    loading: "A carregar…",
    loadError: "Erro ao carregar a obra.",
    notFound: "Obra não encontrada.",
    back: "← Obras",
    published: "Publicado",
    occurred: "Data da obra",
    event: "Evento",
    location: "Local",
    client: "Cliente",
    context: "Contexto",
    categories: "Categorias",
    tags: "Tags",
    summary: "Resumo",
    description: "Descrição",
    programmeNotes: "Notas de programa",
    quotedText: "Texto citado",
    credits: "Créditos",
    media: "Media",
    links: "Ligações",
    review: "Revisão editorial",
    close: "Fechar",
    previous: "← Anterior",
    next: "Seguinte →",
    lightbox: "Visualização da imagem",
    editorLogin: "Entrar como editor",
    editorLogout: "Sair",
    editorPwd: "Palavra-passe",
    editorSubmit: "Desbloquear",
    editorBadPwd: "Palavra-passe incorrecta.",
    editMode: "Editar esta obra",
    editModeOff: "Fechar edição",
    editLoadingDraft: "A carregar dados editáveis…",
    editHydrateError: "Não foi possível aplicar o rascunho à pré-visualização:",
    previewNote: "A pré-visualização abaixo reflecte as tuas alterações.",
    adjacentNav: "Obra anterior e seguinte",
    prevPost: "Anterior",
    nextPost: "Seguinte",
  },
} as const

function roleLabel(role: string, locale: LocaleCode): string {
  const labels: Record<string, { en: string; pt: string }> = {
    collaboration: { en: "Collaboration", pt: "Colaboração" },
    special_thanks: { en: "Special Thanks", pt: "Agradecimentos" },
    photography: { en: "Photography", pt: "Fotografia" },
    art_direction: { en: "Art Direction", pt: "Direcção Artística" },
    music: { en: "Music", pt: "Música" },
    coding: { en: "Coding", pt: "Programação" },
    videomapping: { en: "Videomapping", pt: "Videomapping" },
    team: { en: "Team", pt: "Equipa" },
    assistant: { en: "Assistant", pt: "Assistência" },
    conception_direction: {
      en: "Conception and direction",
      pt: "Concepção e direcção",
    },
    co_creation_performance: {
      en: "Co-creation and performance",
      pt: "Co-criação e interpretação",
    },
    community_performance: {
      en: "Co-creation and performance (community)",
      pt: "Co-criação e interpretação (comunidade)",
    },
    sound_design: { en: "Sound design", pt: "Sonoplastia" },
    lighting_design: { en: "Lighting design", pt: "Desenho de luz" },
    object_design: { en: "Objects", pt: "Objectos" },
    construction: {
      en: "Construction collaborators",
      pt: "Colaboradores construção",
    },
    production_costumes: {
      en: "Production and costumes",
      pt: "Produção e figurinos",
    },
    production: { en: "Production", pt: "Produção" },
  }
  const known = labels[role]
  if (known) return known[locale]
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function embedSrc(media: WorkMedia): string | null {
  const raw = sanitizeWorkMediaExternalUrl(media.externalUrl)
  if (!raw) return null
  if (/youtube\.com\/embed\//u.test(raw) || /player\.vimeo\.com\/video\//u.test(raw)) {
    return raw
  }
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./u, "")
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null
    }
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null
    }
    if (host.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/u.test(part))
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

export function WorkDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedListNav = searchParams.get("highlighted") === "1"
  const worksListPath = highlightedListNav ? "/p/works" : "/works"
  const workDetailQuery = highlightedListNav ? "?highlighted=1" : ""
  const [reloadToken, setReloadToken] = useState(0)
  const { work, error, loading } = useWork(slug, reloadToken)
  const { works: worksList } = useWorks()
  const { locale } = useSiteLocale()
  const ui = UI[locale]
  const {
    editorConfigured,
    isUnlocked,
    editorSecret,
    unlock,
    lock,
  } = useWorkEditorAuth()

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(
    null,
  )

  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [loginPwd, setLoginPwd] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    if (!editMode || !slug) return
    let active = true
    fetchWorkCanonicalDraft(slug)
      .then((raw) => {
        if (!active) return
        setDraft(raw)
      })
      .catch(() => {
        if (!active) return
        setDraft(null)
      })
      .finally(() => {
        if (active) setDraftLoading(false)
      })
    return () => {
      active = false
    }
  }, [editMode, slug])

  const draftHydrateError = useMemo(() => {
    if (!editMode || !draft) return null
    try {
      hydrateCanonicalWork(draft as CanonicalWork)
      return null
    } catch (e: unknown) {
      return e instanceof Error ? e.message : String(e)
    }
  }, [editMode, draft])

  const displayWork = useMemo((): Work | null => {
    if (!work) return null
    if (editMode && draft) {
      try {
        return hydrateCanonicalWork(draft as CanonicalWork)
      } catch {
        return work
      }
    }
    return work
  }, [editMode, draft, work])

  const reloadDraft = useCallback(async () => {
    if (!slug) return
    const raw = await fetchWorkCanonicalDraft(slug)
    setDraft(raw)
  }, [slug])

  const summary = useMemo(
    () => (displayWork ? getLocalizedSummary(displayWork, locale) : null),
    [locale, displayWork],
  )
  const descriptionRaw = useMemo(
    () => (displayWork ? getLocalizedText(displayWork, "description", locale) : null),
    [locale, displayWork],
  )
  const description = useMemo(() => {
    if (!descriptionRaw) return null
    if (descriptionIsRedundantWithSummary(summary, descriptionRaw)) return null
    return descriptionRaw
  }, [summary, descriptionRaw])
  const programmeNotes = useMemo(
    () =>
      displayWork
        ? getLocalizedText(displayWork, "programme_notes", locale)
        : null,
    [locale, displayWork],
  )
  const groupedCredits = useMemo(
    () => groupCreditsByRole(displayWork?.credits ?? []),
    [displayWork?.credits],
  )
  const images = useMemo(
    () => (displayWork?.media ?? []).filter((item) => item.kind === "image"),
    [displayWork?.media],
  )
  const embeds = useMemo(
    () => (displayWork?.media ?? []).filter((item) => item.kind !== "image"),
    [displayWork?.media],
  )
  const visibleQuotes = useMemo(() => {
    const quotes = displayWork?.quotes ?? []
    const exact = quotes.filter((quote) => quote.locale === locale)
    return exact.length > 0 ? exact : quotes
  }, [locale, displayWork?.quotes])
  const lightboxUrls = useMemo(
    () =>
      images
        .map((item) => item.localUrl ?? item.externalUrl ?? "")
        .filter(Boolean),
    [images],
  )
  const fallbackBodyHtml = useMemo(() => {
    if (!displayWork?.bodyHtml) return ""
    const hasStructured =
      Boolean(summary) ||
      Boolean(description) ||
      Boolean(programmeNotes) ||
      (displayWork.quotes?.length ?? 0) > 0 ||
      (displayWork.linksData?.length ?? 0) > 0 ||
      (displayWork.media?.length ?? 0) > 0
    return hasStructured ? "" : prepareLegacyBodyHtml(displayWork.bodyHtml)
  }, [description, programmeNotes, summary, displayWork])

  const navigationPool = useMemo(() => {
    if (!worksList?.length) return []
    if (highlightedListNav) return filterHighlightedWorks(worksList)
    return worksList
  }, [worksList, highlightedListNav])

  const adjacentWorks = useMemo(() => {
    if (!slug || !navigationPool.length) {
      return { prev: null as Work | null, next: null as Work | null }
    }
    const i = navigationPool.findIndex((x) => x.slug === slug)
    if (i < 0) {
      return { prev: null as Work | null, next: null as Work | null }
    }
    return {
      prev: i > 0 ? navigationPool[i - 1]! : null,
      next: i < navigationPool.length - 1 ? navigationPool[i + 1]! : null,
    }
  }, [slug, navigationPool])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (lightbox) {
      if (!d.open) d.showModal()
      return
    }
    if (d.open) d.close()
  }, [lightbox])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setLightbox((l) => (l && l.index > 0 ? { ...l, index: l.index - 1 } : l))
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setLightbox((l) =>
          l && l.index < l.urls.length - 1 ? { ...l, index: l.index + 1 } : l,
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

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
        <Link to={worksListPath}>{ui.back}</Link>
      </div>
    )
  }

  if (!work || !displayWork) {
    return (
      <div className="page">
        <p>{ui.notFound}</p>
        <Link to={worksListPath}>{ui.back}</Link>
      </div>
    )
  }

  const w = displayWork
  const venueLabel = formatVenueLabel(w.venue)

  return (
    <div className="page work-detail">
      {editorConfigured ? (
        <div className="work-editor-access">
          {!isUnlocked ? (
            <div className="work-editor-access__row">
              <button
                type="button"
                className="work-editor-access__btn"
                onClick={() => {
                  setShowLogin((v) => !v)
                  setLoginError(null)
                }}
              >
                {ui.editorLogin}
              </button>
              {showLogin ? (
                <form
                  className="work-editor-access__form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (unlock(loginPwd)) {
                      setLoginPwd("")
                      setLoginError(null)
                      setShowLogin(false)
                    } else {
                      setLoginError(ui.editorBadPwd)
                    }
                  }}
                >
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder={ui.editorPwd}
                    value={loginPwd}
                    onChange={(e) => setLoginPwd(e.target.value)}
                  />
                  <button type="submit">{ui.editorSubmit}</button>
                  {loginError ? (
                    <span className="work-editor-access__err">{loginError}</span>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : (
            <div className="work-editor-access__row work-editor-access__row--between">
              <div className="work-editor-access__controls">
                <button
                  type="button"
                  className="work-editor-access__btn"
                  onClick={() => {
                    setEditMode((v) => {
                      const next = !v
                      if (next) {
                        setDraftLoading(true)
                      } else {
                        setDraft(null)
                        setDraftLoading(false)
                      }
                      return next
                    })
                  }}
                >
                  {editMode ? ui.editModeOff : ui.editMode}
                </button>
                <button
                  type="button"
                  className="work-editor-access__btn work-editor-access__btn--ghost"
                  onClick={() => {
                    lock()
                    setEditMode(false)
                    setDraft(null)
                  }}
                >
                  {ui.editorLogout}
                </button>
              </div>
              {editMode ? (
                <p className="work-editor-access__hint">{ui.previewNote}</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      {isUnlocked && editMode && slug && draft ? (
        <WorkEditorPanel
          slug={slug}
          draft={draft}
          setDraft={setDraft}
          saveSecret={editorSecret}
          locale={locale}
          onReloadDraft={reloadDraft}
          onSaved={() => setReloadToken((n) => n + 1)}
        />
      ) : null}
      {isUnlocked && editMode && draftLoading ? (
        <p className="work-editor-access__loading">{ui.editLoadingDraft}</p>
      ) : null}
      {draftHydrateError ? (
        <p className="work-editor-access__err" role="alert">
          {ui.editHydrateError} {draftHydrateError}
        </p>
      ) : null}
      <p>
        <Link to={worksListPath}>{ui.back}</Link>
      </p>
      {w.featuredImage ? (
        <div className="work-detail-hero">
          <img
            src={rewriteLegacyMediaUrl(w.featuredImage)}
            alt=""
            className="work-detail-hero-img"
          />
        </div>
      ) : null}
      <h1>{w.title}</h1>
      <div className="work-detail-meta-grid">
        {w.publishedAt ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.published}</span>
            <time dateTime={w.publishedAt}>{w.publishedAt}</time>
          </div>
        ) : null}
        {w.occurredOn && w.occurredOn !== w.publishedAt ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.occurred}</span>
            <time dateTime={w.occurredOn}>{w.occurredOn}</time>
          </div>
        ) : null}
        {w.eventName ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.event}</span>
            <span>{w.eventName}</span>
          </div>
        ) : null}
        {venueLabel ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.location}</span>
            <span>{venueLabel}</span>
          </div>
        ) : null}
        {w.clientEntity?.name ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.client}</span>
            <span>{w.clientEntity.name}</span>
          </div>
        ) : null}
        {w.umbrellaEntity?.name ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.context}</span>
            <span>{w.umbrellaEntity.name}</span>
          </div>
        ) : null}
        {w.categories && w.categories.length > 0 ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.categories}</span>
            <span>{w.categories.join(" · ")}</span>
          </div>
        ) : null}
        {w.tags && w.tags.length > 0 ? (
          <div className="work-detail-meta">
            <span className="work-detail-meta__label">{ui.tags}</span>
            <span>{w.tags.join(" · ")}</span>
          </div>
        ) : null}
      </div>

      {summary ? (
        <section className="work-detail-section">
          <h2>{ui.summary}</h2>
          <p>{summary}</p>
        </section>
      ) : null}

      {description ? (
        <section className="work-detail-section">
          <h2>{ui.description}</h2>
          {description.split(/\n{2,}/u).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ) : null}

      {visibleQuotes.length > 0 ? (
        <section className="work-detail-section">
          <h2>{ui.quotedText}</h2>
          {visibleQuotes.map((quote) => (
            <blockquote key={quote.content} className="work-detail-quote">
              <p>{quote.content}</p>
              {quote.sourceLabel ? <cite>{quote.sourceLabel}</cite> : null}
            </blockquote>
          ))}
        </section>
      ) : null}

      {programmeNotes ? (
        <section className="work-detail-section">
          <h2>{ui.programmeNotes}</h2>
          {programmeNotes.split(/\n{2,}/u).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ) : null}

      {groupedCredits.length > 0 ? (
        <section className="work-detail-section">
          <h2>{ui.credits}</h2>
          <div className="work-detail-credit-groups">
            {groupedCredits.map((group) => (
              <div key={group.role} className="work-detail-credit-group">
                <h3>{roleLabel(group.role, locale)}</h3>
                <p>{group.items.map((item) => item.name).join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(images.length > 0 || embeds.length > 0) ? (
        <section className="work-detail-section">
          <h2>{ui.media}</h2>
          {images.length > 0 ? (
            <div className="work-detail-media-grid">
              {images.map((item, index) => {
                const src = item.localUrl ?? item.externalUrl ?? ""
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="work-detail-media-card"
                    onClick={() =>
                      lightboxUrls.length > 0
                        ? setLightbox({ urls: lightboxUrls, index })
                        : null
                    }
                  >
                    <img src={src} alt="" loading="lazy" decoding="async" />
                  </button>
                )
              })}
            </div>
          ) : null}
          {embeds.length > 0 ? (
            <div className="work-detail-embed-list">
              {embeds.map((item) => {
                const src = embedSrc(item)
                if (!src && item.externalUrl) {
                  return (
                    <p key={item.id}>
                      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                        {item.externalUrl}
                      </a>
                    </p>
                  )
                }
                return src ? (
                  <div key={item.id} className="work-body-embed work-body-embed--responsive">
                    <iframe
                      src={src}
                      title={item.platform ?? "external media"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : null
              })}
            </div>
          ) : null}
          {w.mediaCredits && w.mediaCredits.length > 0 ? (
            <p className="work-detail-media-credits">
              {w.mediaCredits.map((credit) => credit.name).join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {w.linksData && w.linksData.length > 0 ? (
        <section className="work-detail-section">
          <h2>{ui.links}</h2>
          <ul className="work-detail-links">
            {w.linksData.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {import.meta.env.DEV && w.reviewFlags && w.reviewFlags.length > 0 ? (
        <section className="work-detail-section">
          <h2>{ui.review}</h2>
          <ul className="work-detail-links">
            {w.reviewFlags.map((flag) => (
              <li key={flag}>{describeReviewFlag(flag, locale)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {fallbackBodyHtml ? (
        <>
          <div
            className="work-body"
            dangerouslySetInnerHTML={{ __html: fallbackBodyHtml }}
          />
          <dialog
            ref={dialogRef}
            className="work-flickr-lightbox"
            aria-label={ui.lightbox}
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightbox(null)
            }}
            onCancel={(e) => {
              e.preventDefault()
              setLightbox(null)
            }}
          >
            {lightbox ? (
              <div
                className="work-flickr-lightbox__inner"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="work-flickr-lightbox__close"
                  aria-label={ui.close}
                  onClick={() => setLightbox(null)}
                >
                  ×
                </button>
                <img
                  src={lightbox.urls[lightbox.index]}
                  alt=""
                  className="work-flickr-lightbox__img"
                />
                {lightbox.urls.length > 1 ? (
                  <div className="work-flickr-lightbox__nav">
                    <button
                      type="button"
                      disabled={lightbox.index <= 0}
                      onClick={() =>
                        setLightbox((l) =>
                          l && l.index > 0 ? { ...l, index: l.index - 1 } : l,
                        )
                      }
                    >
                      {ui.previous}
                    </button>
                    <span className="work-flickr-lightbox__counter">
                      {lightbox.index + 1} / {lightbox.urls.length}
                    </span>
                    <button
                      type="button"
                      disabled={lightbox.index >= lightbox.urls.length - 1}
                      onClick={() =>
                        setLightbox((l) =>
                          l && l.index < l.urls.length - 1
                            ? { ...l, index: l.index + 1 }
                            : l,
                        )
                      }
                    >
                      {ui.next}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </dialog>
        </>
      ) : null}
      {!fallbackBodyHtml ? (
        <dialog
          ref={dialogRef}
          className="work-flickr-lightbox"
          aria-label={ui.lightbox}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(null)
          }}
          onCancel={(e) => {
            e.preventDefault()
            setLightbox(null)
          }}
        >
          {lightbox ? (
            <div
              className="work-flickr-lightbox__inner"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="work-flickr-lightbox__close"
                aria-label={ui.close}
                onClick={() => setLightbox(null)}
              >
                ×
              </button>
              <img
                src={lightbox.urls[lightbox.index]}
                alt=""
                className="work-flickr-lightbox__img"
              />
              {lightbox.urls.length > 1 ? (
                <div className="work-flickr-lightbox__nav">
                  <button
                    type="button"
                    disabled={lightbox.index <= 0}
                    onClick={() =>
                      setLightbox((l) =>
                        l && l.index > 0 ? { ...l, index: l.index - 1 } : l,
                      )
                    }
                  >
                    {ui.previous}
                  </button>
                  <span className="work-flickr-lightbox__counter">
                    {lightbox.index + 1} / {lightbox.urls.length}
                  </span>
                  <button
                    type="button"
                    disabled={lightbox.index >= lightbox.urls.length - 1}
                    onClick={() =>
                      setLightbox((l) =>
                        l && l.index < l.urls.length - 1
                          ? { ...l, index: l.index + 1 }
                          : l,
                      )
                    }
                  >
                    {ui.next}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </dialog>
      ) : null}

      {adjacentWorks.prev || adjacentWorks.next ? (
        <nav className="work-detail-adjacent" aria-label={ui.adjacentNav}>
          <div className="work-detail-adjacent__col work-detail-adjacent__col--prev">
            {adjacentWorks.prev ? (
              <Link
                className="work-detail-adjacent__link"
                to={`/works/${adjacentWorks.prev.slug}${workDetailQuery}`}
                rel="prev"
              >
                <span className="work-detail-adjacent__label">{ui.prevPost}</span>
                <span className="work-detail-adjacent__title">
                  {adjacentWorks.prev.title}
                </span>
              </Link>
            ) : null}
          </div>
          <div className="work-detail-adjacent__col work-detail-adjacent__col--next">
            {adjacentWorks.next ? (
              <Link
                className="work-detail-adjacent__link"
                to={`/works/${adjacentWorks.next.slug}${workDetailQuery}`}
                rel="next"
              >
                <span className="work-detail-adjacent__label">{ui.nextPost}</span>
                <span className="work-detail-adjacent__title">
                  {adjacentWorks.next.title}
                </span>
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
