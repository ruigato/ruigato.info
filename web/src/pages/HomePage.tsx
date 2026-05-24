import { Link } from "react-router-dom"
import { usePage } from "../hooks/usePage"
import { prepareLegacyBodyHtml } from "../lib/legacyHtml"
import type { SiteNav } from "../types/content"
import site from "../data/site.json"

const cfg = site as SiteNav

const title = cfg.siteTitle ?? "Rui Gato"

function homeBodySlug(): string | undefined {
  const s = cfg.homeBodyPageSlug
  if (s === "" || s === null) {
    return undefined
  }
  return s ?? "portfolio"
}

export function HomePage() {
  const slug = homeBodySlug()
  const { page, loading, error } = usePage(slug)

  return (
    <div className="page home-page">
      <header className="home-hero">
        <h1 className="home-name">{title}</h1>
        {cfg.tagline ? <p className="home-tagline">{cfg.tagline}</p> : null}
      </header>
      <p className="home-lead">
        Música em tempo real, som, imagem em movimento e geometria. Percorre as{" "}
        <Link to="/works">obras</Link>, a{" "}
        <Link to="/">timeline</Link> e a página{" "}
        <Link to="/about">about</Link>
        {cfg.items.some((i) => i.to === "/p/contact") ? (
          <>
            {" "}
            ou <Link to="/p/contact">contacto</Link>
          </>
        ) : null}
        .
      </p>

      {slug ? (
        <section className="home-wp-body" aria-label="Conteúdo da página inicial">
          {loading ? <p className="home-wp-loading">A carregar…</p> : null}
          {error ? (
            <p className="home-wp-error">Não foi possível carregar o bloco da página inicial.</p>
          ) : null}
          {page?.bodyHtml ? (
            <div
              className="work-body home-portfolio-body"
              dangerouslySetInnerHTML={{
                __html: prepareLegacyBodyHtml(page.bodyHtml),
              }}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
