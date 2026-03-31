import { Link, useParams } from "react-router-dom"
import { useWorks } from "../hooks/useWorks"
import { findWorkBySlug } from "../lib/works"
import { prepareLegacyBodyHtml, rewriteLegacyMediaUrl } from "../lib/legacyHtml"

export function WorkDetailPage() {
  const { slug } = useParams()
  const { works, error, loading } = useWorks()

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
        <p>Erro ao carregar a obra.</p>
        <Link to="/works">Voltar às obras</Link>
      </div>
    )
  }

  const work = slug && works ? findWorkBySlug(works, slug) : undefined

  if (!work) {
    return (
      <div className="page">
        <p>Obra não encontrada.</p>
        <Link to="/works">Voltar às obras</Link>
      </div>
    )
  }

  return (
    <div className="page work-detail">
      <p>
        <Link to="/works">← Obras</Link>
      </p>
      {work.featuredImage ? (
        <div className="work-detail-hero">
          <img
            src={rewriteLegacyMediaUrl(work.featuredImage)}
            alt=""
            className="work-detail-hero-img"
          />
        </div>
      ) : null}
      <h1>{work.title}</h1>
      {work.date ? <time dateTime={work.date}>{work.date}</time> : null}
      {work.tags && work.tags.length > 0 ? (
        <p className="tags">{work.tags.join(" · ")}</p>
      ) : null}
      {work.bodyHtml ? (
        <div
          className="work-body"
          dangerouslySetInnerHTML={{
            __html: prepareLegacyBodyHtml(work.bodyHtml),
          }}
        />
      ) : null}
    </div>
  )
}
