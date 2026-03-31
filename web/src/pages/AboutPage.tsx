import { usePage } from "../hooks/usePage"
import { prepareLegacyBodyHtml } from "../lib/legacyHtml"

export function AboutPage() {
  const { page, loading, error } = usePage("about")

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
        <p>Erro ao carregar a página.</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="page">
        <h1>About</h1>
        <p>Página não encontrada nos dados exportados.</p>
      </div>
    )
  }

  return (
    <div className="page work-detail">
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
