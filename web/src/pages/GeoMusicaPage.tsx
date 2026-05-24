import { useSiteLocale } from "../context/SiteLocaleContext"
import {
  GEOMUSICA_VIDEO_GROUPS,
  getGeomusicaPageCopy,
  type GeomusicaVideoItem,
} from "../data/geomusicaPageContent"

const GEOMUSICA_LOGO_SRC = "/media/wp-content/uploads/2020/07/logo21_romanesco_720.png"

function YouTubeFigure({ item }: { item: GeomusicaVideoItem }) {
  const src = `https://www.youtube.com/embed/${item.youtubeId}?rel=0`
  const is43 = item.aspect === "4/3"
  return (
    <div
      className={
        is43
          ? "work-body-embed work-body-embed--responsive geomusica-embed geomusica-embed--4-3"
          : "work-body-embed work-body-embed--responsive geomusica-embed"
      }
    >
      <iframe
        src={src}
        title={item.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}

export function GeoMusicaPage() {
  const { locale } = useSiteLocale()
  const c = getGeomusicaPageCopy(locale)

  return (
    <div className="page work-detail geomusica-page">
      <div className="geomusica-page__layout">
        <div className="geomusica-page__text-column">
          <h1 className="geomusica-page__title">{c.title}</h1>
          <p className="geomusica-page__derivative">
            <a
              href={c.derivativeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="geomusica-page__derivative-link"
            >
              {c.derivativeLead}
            </a>
          </p>

          <div className="geomusica-page__intro">
            {c.intro.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "geomusica-page__intro-paragraph geomusica-page__intro-paragraph--lead"
                    : "geomusica-page__intro-paragraph"
                }
              >
                {p}
              </p>
            ))}
          </div>

          <section
            className="geomusica-page__section geomusica-page__section--footer"
            aria-labelledby="geomusica-dedication"
          >
            <h2
              id="geomusica-dedication"
              className="geomusica-page__section-title"
            >
              {c.dedicationTitle}
            </h2>
            <p>{c.dedicationBody}</p>
          </section>

          <section
            className="geomusica-page__section geomusica-page__section--footer"
            aria-labelledby="geomusica-support"
          >
            <h2 id="geomusica-support" className="geomusica-page__section-title">
              {c.supportTitle}
            </h2>
            <p>
              <a
                href={c.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="geomusica-page__support-link"
              >
                {c.supportUrl.replace(/^https:\/\//, "")}
              </a>
            </p>
            <p>{c.supportBody}</p>
          </section>

          <section
            className="geomusica-page__section geomusica-page__section--footer"
            aria-labelledby="geomusica-thanks"
          >
            <h2 id="geomusica-thanks" className="geomusica-page__section-title">
              {c.thanksTitle}
            </h2>
            <p>{c.thanksFamily}</p>
            <p>{c.thanksTeacher}</p>
            <p>{c.thanksDevelopersLead}</p>
            <ul className="geomusica-page__credits">
              {c.thanksContributorLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>{c.thanksClosing}</p>
          </section>
        </div>

        <div className="geomusica-page__media-column">
          <figure className="geomusica-page__logo-figure">
            <img
              src={GEOMUSICA_LOGO_SRC}
              alt={`${c.title} logo`}
              className="geomusica-page__logo"
              loading="eager"
            />
          </figure>
          {GEOMUSICA_VIDEO_GROUPS.map((group, gi) => (
            <section
              key={gi}
              className="geomusica-page__section geomusica-page__section--media"
              aria-labelledby={`geomusica-section-${gi}`}
            >
              <h2
                id={`geomusica-section-${gi}`}
                className="geomusica-page__section-title"
              >
                {c.sectionTitles[gi]}
              </h2>
              <ol className="geomusica-page__video-list">
                {group.videos.map((vid) => (
                  <li key={vid.youtubeId} className="geomusica-page__video-item">
                    <h3 className="geomusica-page__video-title">{vid.title}</h3>
                    <YouTubeFigure item={vid} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
