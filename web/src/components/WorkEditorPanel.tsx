import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import type { LocaleCode } from "../types/content"
import {
  downloadCanonicalJson,
  saveCanonicalWorkToDevServer,
} from "../lib/saveCanonicalWorkClient"
import { invalidateWorkDataCaches } from "../lib/works"

const LINK_KINDS = [
  "external",
  "reference",
  "video",
  "audio",
  "press",
  "project",
] as const

const MEDIA_KINDS = ["image", "gallery", "video_embed", "audio_embed"] as const

const CONFIDENCE = ["", "high", "medium", "low"] as const

const TEXT_KINDS = ["description", "programme_notes"] as const

const UI = {
  en: {
    title: "Edit work (canonical JSON)",
    saveDisk: "Save to disk (dev server)",
    download: "Download JSON",
    reload: "Reload from server",
    saving: "Saving…",
    saved: "Saved.",
    saveFail: "Save failed",
    downloadHint:
      "If save fails, download the file and replace `web/public/data/canonical/works/{slug}.json` manually.",
    id: "Record id",
    workTitle: "Title",
    published: "Published at",
    occurred: "Occurred on",
    event: "Event name",
    primaryCat: "Primary category",
    wpId: "Legacy WordPress id",
    iteration: "Iteration of work id",
    summary: "Summary (default)",
    summaryPt: "Summary PT",
    summaryEn: "Summary EN",
    bodyHtml: "Body HTML (legacy)",
    categories: "Categories (comma-separated)",
    tags: "Tags (comma-separated)",
    venue: "Venue",
    venueName: "Venue name",
    city: "City",
    region: "Region / state",
    country: "Country",
    rawLocation: "Raw location",
    clientJson: "Client (JSON object or empty {})",
    umbrellaJson: "Umbrella entity (JSON or empty {})",
    umbrellaConf: "Umbrella confidence",
    descriptions: "Text blocks (descriptions / programme notes)",
    addDesc: "Add text block",
    quotes: "Quotes",
    addQuote: "Add quote",
    credits: "Credits",
    addCredit: "Add credit",
    links: "Links",
    addLink: "Add link",
    media: "Media",
    addMedia: "Add media item",
    featured: "Featured media",
    noFeatured: "No featured media",
    reviewFlags: "Review flags (comma-separated)",
    locale: "Locale",
    kind: "Kind",
    content: "Content",
    remove: "Remove",
    role: "Role",
    name: "Name",
    sortOrder: "Sort order",
    org: "Organization",
    label: "Label",
    url: "URL",
    platform: "Platform",
    localPath: "Local path / URL",
    externalUrl: "External URL",
    galleryLines: "Gallery image URLs (one per line)",
    mediaId: "Id",
    sourceLabel: "Source label",
    sourceUrl: "Source URL",
  },
  pt: {
    title: "Editar obra (JSON canónico)",
    saveDisk: "Gravar no disco (servidor dev)",
    download: "Descarregar JSON",
    reload: "Recarregar do servidor",
    saving: "A gravar…",
    saved: "Gravado.",
    saveFail: "Falha ao gravar",
    downloadHint:
      "Se a gravação falhar, descarregue o ficheiro e substitua manualmente `web/public/data/canonical/works/{slug}.json`.",
    id: "Id do registo",
    workTitle: "Título",
    published: "Publicado em",
    occurred: "Data da obra",
    event: "Nome do evento",
    primaryCat: "Categoria principal",
    wpId: "Id WordPress legado",
    iteration: "Id da obra iterada",
    summary: "Resumo (predefinição)",
    summaryPt: "Resumo PT",
    summaryEn: "Resumo EN",
    bodyHtml: "Body HTML (legado)",
    categories: "Categorias (separadas por vírgula)",
    tags: "Etiquetas (separadas por vírgula)",
    venue: "Local",
    venueName: "Nome do espaço",
    city: "Cidade",
    region: "Região / estado",
    country: "País",
    rawLocation: "Localização em texto",
    clientJson: "Cliente (JSON ou vazio {})",
    umbrellaJson: "Entidade contextual (JSON ou vazio {})",
    umbrellaConf: "Confiança (contexto)",
    descriptions: "Blocos de texto",
    addDesc: "Adicionar bloco",
    quotes: "Citações",
    addQuote: "Adicionar citação",
    credits: "Créditos",
    addCredit: "Adicionar crédito",
    links: "Ligações",
    addLink: "Adicionar ligação",
    media: "Media",
    addMedia: "Adicionar media",
    featured: "Media em destaque",
    noFeatured: "Sem media em destaque",
    reviewFlags: "Flags de revisão (separadas por vírgula)",
    locale: "Locale",
    kind: "Tipo",
    content: "Conteúdo",
    remove: "Remover",
    role: "Papel",
    name: "Nome",
    sortOrder: "Ordem",
    org: "Organização",
    label: "Rótulo",
    url: "URL",
    platform: "Plataforma",
    localPath: "Caminho local / URL",
    externalUrl: "URL externa",
    galleryLines: "URLs da galeria (uma por linha)",
    mediaId: "Id",
    sourceLabel: "Fonte (rótulo)",
    sourceUrl: "Fonte (URL)",
  },
} as const

/** Vírgula, ponto e vírgula ou quebra de linha — para colar listas antigas. */
function linesToList(s: string): string[] {
  return s
    .split(/\s*[,;\n]+\s*/u)
    .map((x) => x.trim())
    .filter(Boolean)
}

function listToCommaSeparated(v: unknown): string {
  if (!Array.isArray(v)) return ""
  return v
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(", ")
}

function listToLines(v: unknown): string {
  if (!Array.isArray(v)) return ""
  return v.map((x) => String(x)).join("\n")
}

function parseJsonObjectField(raw: string): unknown | null {
  const t = raw.trim()
  if (!t) return {}
  try {
    const o = JSON.parse(t) as unknown
    if (o !== null && typeof o === "object" && !Array.isArray(o)) return o
    return null
  } catch {
    return null
  }
}

function entityToString(v: unknown): string {
  if (v === null || v === undefined) return ""
  return JSON.stringify(v, null, 2)
}

function getVenue(d: Record<string, unknown>): Record<string, unknown> {
  const v = d.venue
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}

function setVenue(
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>,
  patch: Record<string, unknown>,
) {
  setDraft((d) => {
    const base = d ?? {}
    const prev = getVenue(base)
    const nextVenue = { ...prev, ...patch }
    const empty =
      !nextVenue.venue_name &&
      !nextVenue.city &&
      !nextVenue.region_or_state &&
      !nextVenue.country &&
      !nextVenue.raw_location
    return { ...base, venue: empty ? null : nextVenue }
  })
}

export type WorkEditorPanelProps = {
  slug: string
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  saveSecret: string
  locale: LocaleCode
  onReloadDraft: () => Promise<void>
  onSaved: () => void
}

export function WorkEditorPanel({
  slug,
  draft,
  setDraft,
  saveSecret,
  locale,
  onReloadDraft,
  onSaved,
}: WorkEditorPanelProps) {
  const ui = UI[locale]
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const summaryLoc = useMemo(() => {
    const sl = draft.summary_localized
    if (sl && typeof sl === "object" && !Array.isArray(sl)) {
      return sl as Record<string, string>
    }
    return {}
  }, [draft.summary_localized])

  const setSummaryLoc = useCallback(
    (key: string, value: string) => {
      setDraft((d) => {
        const base = d ?? {}
        const prev =
          base.summary_localized && typeof base.summary_localized === "object"
            ? { ...(base.summary_localized as Record<string, string>) }
            : {}
        const next = { ...prev, [key]: value }
        const cleaned = Object.fromEntries(
          Object.entries(next).filter(([, v]) => v.trim().length > 0),
        )
        return {
          ...base,
          summary_localized:
            Object.keys(cleaned).length > 0 ? cleaned : undefined,
        }
      })
    },
    [setDraft],
  )

  const onSaveDisk = async () => {
    setBusy(true)
    setMessage(null)
    const result = await saveCanonicalWorkToDevServer(slug, saveSecret, draft)
    setBusy(false)
    if (result.ok) {
      invalidateWorkDataCaches()
      setMessage(ui.saved)
      onSaved()
    } else {
      setMessage(`${ui.saveFail}: ${result.error}`)
    }
  }

  const onDownload = () => {
    downloadCanonicalJson(slug, draft)
    setMessage(ui.downloadHint)
  }

  const venue = getVenue(draft)

  return (
    <div className="work-editor-panel">
      <h2 className="work-editor-panel__title">{ui.title}</h2>
      <p className="work-editor-panel__slug">
        slug: <code>{slug}</code>
      </p>
      <div className="work-editor-toolbar">
        <button type="button" disabled={busy} onClick={() => void onSaveDisk()}>
          {busy ? ui.saving : ui.saveDisk}
        </button>
        <button type="button" disabled={busy} onClick={onDownload}>
          {ui.download}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void onReloadDraft().catch(() => {
              setMessage("Reload failed")
            })
          }}
        >
          {ui.reload}
        </button>
      </div>
      {message ? <p className="work-editor-message">{message}</p> : null}

      <fieldset className="work-editor-fieldset">
        <legend>{ui.id}</legend>
        <input
          type="text"
          className="work-editor-input"
          value={draft.id != null ? String(draft.id) : ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              id: e.target.value.trim() || undefined,
            }))
          }
        />
      </fieldset>

      <fieldset className="work-editor-fieldset">
        <legend>{ui.workTitle}</legend>
        <input
          type="text"
          className="work-editor-input"
          value={typeof draft.title === "string" ? draft.title : ""}
          onChange={(e) => setDraft((d) => ({ ...(d ?? {}), title: e.target.value }))}
        />
      </fieldset>

      <div className="work-editor-grid2">
        <label className="work-editor-label">
          {ui.published}
          <input
            type="text"
            className="work-editor-input"
            placeholder="YYYY-MM-DD"
            value={
              typeof draft.published_at === "string" ? draft.published_at : ""
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                published_at: e.target.value.trim() || null,
              }))
            }
          />
        </label>
        <label className="work-editor-label">
          {ui.occurred}
          <input
            type="text"
            className="work-editor-input"
            placeholder="YYYY-MM-DD"
            value={typeof draft.occurred_on === "string" ? draft.occurred_on : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                occurred_on: e.target.value.trim() || null,
              }))
            }
          />
        </label>
        <label className="work-editor-label">
          {ui.event}
          <input
            type="text"
            className="work-editor-input"
            value={typeof draft.event_name === "string" ? draft.event_name : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                event_name: e.target.value.trim() || null,
              }))
            }
          />
        </label>
        <label className="work-editor-label">
          {ui.primaryCat}
          <input
            type="text"
            className="work-editor-input"
            value={
              typeof draft.primary_category === "string"
                ? draft.primary_category
                : ""
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                primary_category: e.target.value.trim() || null,
              }))
            }
          />
        </label>
        <label className="work-editor-label">
          {ui.wpId}
          <input
            type="number"
            className="work-editor-input"
            value={
              typeof draft.legacy_wp_id === "number" ? draft.legacy_wp_id : ""
            }
            onChange={(e) => {
              const v = e.target.value
              setDraft((d) => ({
                ...(d ?? {}),
                legacy_wp_id: v === "" ? null : Number(v),
              }))
            }}
          />
        </label>
        <label className="work-editor-label">
          {ui.iteration}
          <input
            type="text"
            className="work-editor-input"
            value={
              typeof draft.iteration_of_work_id === "string"
                ? draft.iteration_of_work_id
                : ""
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                iteration_of_work_id: e.target.value.trim() || null,
              }))
            }
          />
        </label>
      </div>

      <label className="work-editor-label">
        {ui.summary}
        <textarea
          className="work-editor-textarea work-editor-textarea--short"
          value={typeof draft.summary === "string" ? draft.summary : ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              summary: e.target.value.trim() ? e.target.value : null,
            }))
          }
        />
      </label>
      <div className="work-editor-grid2">
        <label className="work-editor-label">
          {ui.summaryPt}
          <textarea
            className="work-editor-textarea work-editor-textarea--short"
            value={summaryLoc.pt ?? ""}
            onChange={(e) => setSummaryLoc("pt", e.target.value)}
          />
        </label>
        <label className="work-editor-label">
          {ui.summaryEn}
          <textarea
            className="work-editor-textarea work-editor-textarea--short"
            value={summaryLoc.en ?? ""}
            onChange={(e) => setSummaryLoc("en", e.target.value)}
          />
        </label>
      </div>

      <label className="work-editor-label">
        {ui.bodyHtml}
        <textarea
          className="work-editor-textarea work-editor-textarea--tall"
          value={typeof draft.body_html === "string" ? draft.body_html : ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              body_html: e.target.value.trim() ? e.target.value : null,
            }))
          }
        />
      </label>

      <label className="work-editor-label">
        {ui.categories}
        <input
          type="text"
          className="work-editor-input"
          value={listToCommaSeparated(draft.categories)}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              categories: linesToList(e.target.value),
            }))
          }
        />
      </label>
      <label className="work-editor-label">
        {ui.tags}
        <input
          type="text"
          className="work-editor-input"
          value={listToCommaSeparated(draft.tags)}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              tags: linesToList(e.target.value),
            }))
          }
        />
      </label>

      <fieldset className="work-editor-fieldset">
        <legend>{ui.venue}</legend>
        <div className="work-editor-grid2">
          <label className="work-editor-label">
            {ui.venueName}
            <input
              type="text"
              className="work-editor-input"
              value={
                typeof venue.venue_name === "string" ? venue.venue_name : ""
              }
              onChange={(e) =>
                setVenue(setDraft, {
                  venue_name: e.target.value.trim() || null,
                })
              }
            />
          </label>
          <label className="work-editor-label">
            {ui.city}
            <input
              type="text"
              className="work-editor-input"
              value={typeof venue.city === "string" ? venue.city : ""}
              onChange={(e) =>
                setVenue(setDraft, { city: e.target.value.trim() || null })
              }
            />
          </label>
          <label className="work-editor-label">
            {ui.region}
            <input
              type="text"
              className="work-editor-input"
              value={
                typeof venue.region_or_state === "string"
                  ? venue.region_or_state
                  : ""
              }
              onChange={(e) =>
                setVenue(setDraft, {
                  region_or_state: e.target.value.trim() || null,
                })
              }
            />
          </label>
          <label className="work-editor-label">
            {ui.country}
            <input
              type="text"
              className="work-editor-input"
              value={typeof venue.country === "string" ? venue.country : ""}
              onChange={(e) =>
                setVenue(setDraft, {
                  country: e.target.value.trim() || null,
                })
              }
            />
          </label>
          <label className="work-editor-label work-editor-label--full">
            {ui.rawLocation}
            <input
              type="text"
              className="work-editor-input"
              value={
                typeof venue.raw_location === "string" ? venue.raw_location : ""
              }
              onChange={(e) =>
                setVenue(setDraft, {
                  raw_location: e.target.value.trim() || null,
                })
              }
            />
          </label>
        </div>
      </fieldset>

      <label className="work-editor-label">
        {ui.clientJson}
        <textarea
          className="work-editor-textarea work-editor-textarea--json"
          value={entityToString(draft.client)}
          onChange={(e) => {
            const parsed = parseJsonObjectField(e.target.value)
            if (parsed !== null) {
              setDraft((d) => ({
                ...(d ?? {}),
                client:
                  parsed && typeof parsed === "object" && Object.keys(parsed).length === 0
                    ? null
                    : parsed,
              }))
            }
          }}
        />
      </label>
      <label className="work-editor-label">
        {ui.umbrellaJson}
        <textarea
          className="work-editor-textarea work-editor-textarea--json"
          value={entityToString(draft.umbrella_entity)}
          onChange={(e) => {
            const parsed = parseJsonObjectField(e.target.value)
            if (parsed !== null) {
              setDraft((d) => ({
                ...(d ?? {}),
                umbrella_entity:
                  parsed && typeof parsed === "object" && Object.keys(parsed).length === 0
                    ? null
                    : parsed,
              }))
            }
          }}
        />
      </label>
      <label className="work-editor-label">
        {ui.umbrellaConf}
        <select
          className="work-editor-input"
          value={
            typeof draft.umbrella_entity_confidence === "string"
              ? draft.umbrella_entity_confidence
              : ""
          }
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              umbrella_entity_confidence: e.target.value
                ? e.target.value
                : null,
            }))
          }
        >
          {CONFIDENCE.map((c) => (
            <option key={c || "none"} value={c}>
              {c || "—"}
            </option>
          ))}
        </select>
      </label>

      <DescriptionsEditor draft={draft} setDraft={setDraft} ui={ui} />
      <QuotesEditor draft={draft} setDraft={setDraft} ui={ui} />
      <CreditsEditor draft={draft} setDraft={setDraft} ui={ui} />
      <LinksEditor draft={draft} setDraft={setDraft} ui={ui} />
      <MediaEditor draft={draft} setDraft={setDraft} ui={ui} />
      <FeaturedEditor draft={draft} setDraft={setDraft} ui={ui} />

      <label className="work-editor-label">
        {ui.reviewFlags}
        <input
          type="text"
          className="work-editor-input"
          value={Array.isArray(draft.review_flags) ? draft.review_flags.join(", ") : ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...(d ?? {}),
              review_flags: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
        />
      </label>
    </div>
  )
}

type EditorUiStrings = (typeof UI)["en"] | (typeof UI)["pt"]

function DescriptionsEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const items = Array.isArray(draft.descriptions)
    ? (draft.descriptions as Record<string, unknown>[])
    : []

  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.descriptions}</legend>
      {items.map((row, index) => (
        <div key={index} className="work-editor-array-row">
          <select
            className="work-editor-input work-editor-input--narrow"
            value={typeof row.locale === "string" ? row.locale : "pt"}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], locale: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), descriptions: next }))
            }}
          >
            <option value="pt">pt</option>
            <option value="en">en</option>
          </select>
          <select
            className="work-editor-input work-editor-input--narrow"
            value={typeof row.kind === "string" ? row.kind : "description"}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], kind: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), descriptions: next }))
            }}
          >
            {TEXT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <textarea
            className="work-editor-textarea work-editor-textarea--grow"
            value={typeof row.content === "string" ? row.content : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], content: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), descriptions: next }))
            }}
          />
          <button
            type="button"
            className="work-editor-remove"
            onClick={() => {
              const next = items.filter((_, i) => i !== index)
              setDraft((d) => ({ ...(d ?? {}), descriptions: next }))
            }}
          >
            {ui.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setDraft((d) => ({
            ...(d ?? {}),
            descriptions: [
              ...items,
              { locale: "pt", kind: "description", content: "" },
            ],
          }))
        }
      >
        {ui.addDesc}
      </button>
    </fieldset>
  )
}

function QuotesEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const items = Array.isArray(draft.quotes)
    ? (draft.quotes as Record<string, unknown>[])
    : []
  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.quotes}</legend>
      {items.map((row, index) => (
        <div key={index} className="work-editor-array-row work-editor-array-row--stack">
          <select
            className="work-editor-input work-editor-input--narrow"
            value={typeof row.locale === "string" ? row.locale : "pt"}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], locale: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), quotes: next }))
            }}
          >
            <option value="pt">pt</option>
            <option value="en">en</option>
          </select>
          <textarea
            className="work-editor-textarea"
            placeholder={ui.content}
            value={typeof row.content === "string" ? row.content : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], content: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), quotes: next }))
            }}
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.sourceLabel}
            value={
              typeof row.source_label === "string" ? row.source_label : ""
            }
            onChange={(e) => {
              const next = [...items]
              next[index] = {
                ...next[index],
                source_label: e.target.value.trim() || null,
              }
              setDraft((d) => ({ ...(d ?? {}), quotes: next }))
            }}
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.sourceUrl}
            value={typeof row.source_url === "string" ? row.source_url : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = {
                ...next[index],
                source_url: e.target.value.trim() || null,
              }
              setDraft((d) => ({ ...(d ?? {}), quotes: next }))
            }}
          />
          <button
            type="button"
            className="work-editor-remove"
            onClick={() => {
              const next = items.filter((_, i) => i !== index)
              setDraft((d) => ({ ...(d ?? {}), quotes: next }))
            }}
          >
            {ui.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setDraft((d) => ({
            ...(d ?? {}),
            quotes: [
              ...items,
              {
                locale: "pt",
                content: "",
                source_label: null,
                source_url: null,
              },
            ],
          }))
        }
      >
        {ui.addQuote}
      </button>
    </fieldset>
  )
}

function CreditsEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const items = Array.isArray(draft.credits)
    ? (draft.credits as Record<string, unknown>[])
    : []
  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.credits}</legend>
      {items.map((row, index) => (
        <div key={index} className="work-editor-array-row work-editor-array-row--stack">
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.role}
            value={typeof row.role === "string" ? row.role : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], role: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), credits: next }))
            }}
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.name}
            value={typeof row.name === "string" ? row.name : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], name: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), credits: next }))
            }}
          />
          <input
            type="number"
            className="work-editor-input work-editor-input--narrow"
            placeholder={ui.sortOrder}
            value={typeof row.sort_order === "number" ? row.sort_order : ""}
            onChange={(e) => {
              const next = [...items]
              const v = e.target.value
              next[index] = {
                ...next[index],
                sort_order: v === "" ? index : Number(v),
              }
              setDraft((d) => ({ ...(d ?? {}), credits: next }))
            }}
          />
          <label className="work-editor-inline-check">
            <input
              type="checkbox"
              checked={Boolean(row.is_organization)}
              onChange={(e) => {
                const next = [...items]
                next[index] = {
                  ...next[index],
                  is_organization: e.target.checked,
                }
                setDraft((d) => ({ ...(d ?? {}), credits: next }))
              }}
            />
            {ui.org}
          </label>
          <button
            type="button"
            className="work-editor-remove"
            onClick={() => {
              const next = items.filter((_, i) => i !== index)
              setDraft((d) => ({ ...(d ?? {}), credits: next }))
            }}
          >
            {ui.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setDraft((d) => ({
            ...(d ?? {}),
            credits: [
              ...items,
              { role: "", name: "", sort_order: items.length, is_organization: false },
            ],
          }))
        }
      >
        {ui.addCredit}
      </button>
    </fieldset>
  )
}

function LinksEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const items = Array.isArray(draft.links)
    ? (draft.links as Record<string, unknown>[])
    : []
  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.links}</legend>
      {items.map((row, index) => (
        <div key={index} className="work-editor-array-row work-editor-array-row--stack">
          <input
            type="text"
            className="work-editor-input work-editor-input--narrow"
            placeholder={ui.mediaId}
            value={typeof row.id === "string" ? row.id : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], id: e.target.value.trim() }
              setDraft((d) => ({ ...(d ?? {}), links: next }))
            }}
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.label}
            value={typeof row.label === "string" ? row.label : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], label: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), links: next }))
            }}
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.url}
            value={typeof row.url === "string" ? row.url : ""}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], url: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), links: next }))
            }}
          />
          <select
            className="work-editor-input work-editor-input--narrow"
            value={typeof row.kind === "string" ? row.kind : "external"}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...next[index], kind: e.target.value }
              setDraft((d) => ({ ...(d ?? {}), links: next }))
            }}
          >
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="work-editor-remove"
            onClick={() => {
              const next = items.filter((_, i) => i !== index)
              setDraft((d) => ({ ...(d ?? {}), links: next }))
            }}
          >
            {ui.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setDraft((d) => ({
            ...(d ?? {}),
            links: [
              ...items,
              {
                id: `link-${items.length + 1}`,
                label: "",
                url: "",
                kind: "external",
              },
            ],
          }))
        }
      >
        {ui.addLink}
      </button>
    </fieldset>
  )
}

function MediaEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const items = Array.isArray(draft.media)
    ? (draft.media as Record<string, unknown>[])
    : []

  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.media}</legend>
      {items.map((row, index) => {
        const kind = typeof row.kind === "string" ? row.kind : "image"
        const galleryLines = listToLines(row.gallery_items)
        return (
          <div
            key={index}
            className="work-editor-array-row work-editor-array-row--stack work-editor-media-block"
          >
            <div className="work-editor-media-row">
              <input
                type="text"
                className="work-editor-input work-editor-input--narrow"
                placeholder={ui.mediaId}
                value={typeof row.id === "string" ? row.id : ""}
                onChange={(e) => {
                  const next = [...items]
                  next[index] = { ...next[index], id: e.target.value.trim() }
                  setDraft((d) => ({ ...(d ?? {}), media: next }))
                }}
              />
              <select
                className="work-editor-input work-editor-input--narrow"
                value={kind}
                onChange={(e) => {
                  const next = [...items]
                  next[index] = { ...next[index], kind: e.target.value }
                  setDraft((d) => ({ ...(d ?? {}), media: next }))
                }}
              >
                {MEDIA_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="work-editor-input work-editor-input--narrow"
                placeholder={ui.sortOrder}
                value={typeof row.sort_order === "number" ? row.sort_order : ""}
                onChange={(e) => {
                  const next = [...items]
                  const v = e.target.value
                  next[index] = {
                    ...next[index],
                    sort_order: v === "" ? index : Number(v),
                  }
                  setDraft((d) => ({ ...(d ?? {}), media: next }))
                }}
              />
            </div>
            {kind === "gallery" ? (
              <label className="work-editor-label">
                {ui.galleryLines}
                <textarea
                  className="work-editor-textarea work-editor-textarea--short"
                  value={galleryLines}
                  onChange={(e) => {
                    const next = [...items]
                    next[index] = {
                      ...next[index],
                      gallery_items: linesToList(e.target.value),
                    }
                    setDraft((d) => ({ ...(d ?? {}), media: next }))
                  }}
                />
              </label>
            ) : (
              <>
                <input
                  type="text"
                  className="work-editor-input"
                  placeholder={ui.localPath}
                  value={
                    typeof row.local_path === "string" ? row.local_path : ""
                  }
                  onChange={(e) => {
                    const next = [...items]
                    next[index] = {
                      ...next[index],
                      local_path: e.target.value.trim() || null,
                    }
                    setDraft((d) => ({ ...(d ?? {}), media: next }))
                  }}
                />
                <input
                  type="text"
                  className="work-editor-input"
                  placeholder={ui.externalUrl}
                  value={
                    typeof row.external_url === "string" ? row.external_url : ""
                  }
                  onChange={(e) => {
                    const next = [...items]
                    next[index] = {
                      ...next[index],
                      external_url: e.target.value.trim() || null,
                    }
                    setDraft((d) => ({ ...(d ?? {}), media: next }))
                  }}
                />
                <input
                  type="text"
                  className="work-editor-input work-editor-input--narrow"
                  placeholder={ui.platform}
                  value={
                    typeof row.platform === "string" ? row.platform : ""
                  }
                  onChange={(e) => {
                    const next = [...items]
                    next[index] = {
                      ...next[index],
                      platform: e.target.value.trim() || null,
                    }
                    setDraft((d) => ({ ...(d ?? {}), media: next }))
                  }}
                />
              </>
            )}
            <button
              type="button"
              className="work-editor-remove"
              onClick={() => {
                const next = items.filter((_, i) => i !== index)
                setDraft((d) => ({ ...(d ?? {}), media: next }))
              }}
            >
              {ui.remove}
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() =>
          setDraft((d) => ({
            ...(d ?? {}),
            media: [
              ...items,
              {
                id: `media-${items.length + 1}`,
                kind: "image",
                sort_order: items.length,
                local_path: null,
                external_url: null,
                platform: null,
              },
            ],
          }))
        }
      >
        {ui.addMedia}
      </button>
    </fieldset>
  )
}

function FeaturedEditor({
  draft,
  setDraft,
  ui,
}: {
  draft: Record<string, unknown>
  setDraft: Dispatch<SetStateAction<Record<string, unknown> | null>>
  ui: EditorUiStrings
}) {
  const fm = draft.featured_media
  const hasFeatured = fm !== null && fm !== undefined && typeof fm === "object"
  const row = hasFeatured ? (fm as Record<string, unknown>) : {}
  const kind = typeof row.kind === "string" ? row.kind : "image"

  return (
    <fieldset className="work-editor-fieldset">
      <legend>{ui.featured}</legend>
      <label className="work-editor-inline-check">
        <input
          type="checkbox"
          checked={!hasFeatured}
          onChange={(e) => {
            if (e.target.checked) {
              setDraft((d) => ({ ...(d ?? {}), featured_media: null }))
            } else {
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  id: "media-featured",
                  kind: "image",
                  sort_order: 0,
                  local_path: null,
                  external_url: null,
                  platform: null,
                },
              }))
            }
          }}
        />
        {ui.noFeatured}
      </label>
      {hasFeatured ? (
        <div className="work-editor-array-row work-editor-array-row--stack">
          <input
            type="text"
            className="work-editor-input work-editor-input--narrow"
            placeholder={ui.mediaId}
            value={typeof row.id === "string" ? row.id : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  id: e.target.value.trim(),
                },
              }))
            }
          />
          <select
            className="work-editor-input work-editor-input--narrow"
            value={kind}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  kind: e.target.value,
                },
              }))
            }
          >
            {MEDIA_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="work-editor-input work-editor-input--narrow"
            placeholder={ui.sortOrder}
            value={typeof row.sort_order === "number" ? row.sort_order : 0}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  sort_order:
                    e.target.value === "" ? 0 : Number(e.target.value),
                },
              }))
            }
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.localPath}
            value={typeof row.local_path === "string" ? row.local_path : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  local_path: e.target.value.trim() || null,
                },
              }))
            }
          />
          <input
            type="text"
            className="work-editor-input"
            placeholder={ui.externalUrl}
            value={typeof row.external_url === "string" ? row.external_url : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  external_url: e.target.value.trim() || null,
                },
              }))
            }
          />
          <input
            type="text"
            className="work-editor-input work-editor-input--narrow"
            placeholder={ui.platform}
            value={typeof row.platform === "string" ? row.platform : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...(d ?? {}),
                featured_media: {
                  ...((d ?? {}).featured_media as object as Record<string, unknown>),
                  platform: e.target.value.trim() || null,
                },
              }))
            }
          />
        </div>
      ) : null}
    </fieldset>
  )
}
