import { Link, Navigate, useParams } from "react-router-dom"
import { usePage } from "../hooks/usePage"
import { prepareLegacyBodyHtml } from "../lib/legacyHtml"

/** Slugs WordPress que têm rota dedicada nesta app. */
const SLUG_REDIRECT: Record<string, string> = {
  about: "/about",
  timeline: "/timeline",
  "timeline-three": "/timeline",
  "timeline-webgl": "/timeline",
}

function ExportedPageBody({ slug }: { slug: string }) {
  const { page, loading, error } = usePage(slug)

  if (loading) {
    return (
      <div className="page">
        <p>A carregar…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <p>Erro ao carregar páginas.</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="page">
        <p>Página não encontrada.</p>
        <Link to="/">Início</Link>
      </div>
    )
  }

  return (
    <div className="page work-detail">
      <p>
        <Link to="/">← Início</Link>
      </p>
      <h1>{page.title}</h1>
      {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
      {page.bodyHtml ? (
        <div
          className="work-body"
          dangerouslySetInnerHTML={{
            __html: prepareLegacyBodyHtml(page.bodyHtml),
          }}
        />
      ) : null}
    </div>
  )
}

export function ExportedPageRoute() {
  const { slug } = useParams()

  if (!slug) {
    return (
      <div className="page">
        <p>Slug em falta.</p>
        <Link to="/">Início</Link>
      </div>
    )
  }

  const redirect = SLUG_REDIRECT[slug]
  if (redirect) {
    return <Navigate to={redirect} replace />
  }

  return <ExportedPageBody key={slug} slug={slug} />
}
