import { Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { usePage } from "../hooks/usePage"
import { useWorks } from "../hooks/useWorks"
import { loadWorkDetail } from "../lib/works"
import { prepareLegacyBodyHtml, rewriteLegacyMediaUrl } from "../lib/legacyHtml"
import type { Work } from "../types/content"

type MusicRelease = {
  href?: string
  title: string
  imageSrc?: string
  sortKey?: string
  seriesKey?: string
  kicker?: string
}

type MusicPageContent = {
  releases: MusicRelease[]
  footerLink: { href: string; label: string } | null
}

const LEGACY_WP_MEDIA_PREFIXES = [
  "https://www.ruigato.info/wp-content/",
  "http://www.ruigato.info/wp-content/",
  "https://ruigato.info/wp-content/",
  "http://ruigato.info/wp-content/",
] as const

function localizeLegacyWpMediaUrl(url: string): string {
  for (const prefix of LEGACY_WP_MEDIA_PREFIXES) {
    if (url.startsWith(prefix)) {
      return `/media/wp-content/${url.slice(prefix.length)}`
    }
  }
  return url
}

const FEATURED_FULL_RELEASE: MusicRelease = {
  href: "https://youtu.be/hNgTr9Tfrn8?si=UMQ8hMwjc9zl5e3l",
  title: "Shapes For Piano 1",
  imageSrc: "https://i.ytimg.com/vi/hNgTr9Tfrn8/hqdefault.jpg",
  kicker: "GeoMusica official release",
  sortKey: "2021-01-01",
}

const OFFICIAL_YOUTUBE_RELEASES: MusicRelease[] = [
  {
    href: "https://www.youtube.com/watch?v=D0skQOed4kg",
    title: "Allotrope1 - n8 n4 s1 g250",
    imageSrc: "https://i.ytimg.com/vi/D0skQOed4kg/hqdefault.jpg",
    kicker: "GeoMusica official release",
    sortKey: "2022-09-10",
  },
  {
    href: "https://www.youtube.com/watch?v=8jTjJgghd1A",
    title: "Allotrope2 - n8 n2 g360 g144 s1",
    imageSrc: "https://i.ytimg.com/vi/8jTjJgghd1A/hqdefault.jpg",
    kicker: "GeoMusica official release",
    sortKey: "2022-09-10",
  },
].sort((a, b) => (b.sortKey ?? "").localeCompare(a.sortKey ?? ""))

const GEOMUSICA_RELEASES: MusicRelease[] = [
  FEATURED_FULL_RELEASE,
  ...OFFICIAL_YOUTUBE_RELEASES,
]

function parseMusicPageContent(html: string): MusicPageContent {
  if (typeof DOMParser === "undefined") {
    return { releases: [], footerLink: null }
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
  const anchors = Array.from(doc.body.querySelectorAll("a"))
  const releases: MusicRelease[] = []
  let footerLink: { href: string; label: string } | null = null

  for (let i = 0; i < anchors.length; i += 1) {
    const anchor = anchors[i]
    const img = anchor.querySelector("img")
    if (img) {
      const titleAnchor = anchors[i + 1]
      const title = titleAnchor?.textContent?.trim() || img.getAttribute("alt")?.trim() || ""
      const href = anchor.getAttribute("href")?.trim() || titleAnchor?.getAttribute("href")?.trim() || ""
      const imageSrc = localizeLegacyWpMediaUrl(img.getAttribute("src")?.trim() || "")

      if (title && href && imageSrc) {
        releases.push({ href, title, imageSrc })
      }

      if (titleAnchor) {
        i += 1
      }
      continue
    }

    const label = anchor.textContent?.trim() || ""
    const href = anchor.getAttribute("href")?.trim() || ""
    if (label && href) {
      footerLink = { href, label }
    }
  }

  return { releases, footerLink }
}

function extractSoundcloudMusicReleases(works: Work[] | null): MusicRelease[] {
  if (!works) return []

  const candidates = works
    .filter((work) => {
      const isMusicRelease = (work.categories ?? []).some(
        (category) => category.trim().toLowerCase() === "music release",
      )
      const soundcloudLink =
        work.linksData?.find((link) => /soundcloud\.com/i.test(link.url)) ??
        work.media?.find((item) => /soundcloud\.com/i.test(item.externalUrl ?? ""))

      return Boolean(isMusicRelease && soundcloudLink)
    })
    .map((work) => {
      const href =
        work.linksData?.find((link) => /soundcloud\.com/i.test(link.url))?.url ??
        work.media?.find((item) => /soundcloud\.com/i.test(item.externalUrl ?? ""))
          ?.externalUrl ??
        ""
      const imageSrc =
        work.featuredImageThumb ??
        work.featuredImage ??
        work.linksData?.find((link) => /soundcloud\.com/i.test(link.url))?.previewImage ??
        ""

      return {
        href,
        title: work.title,
        imageSrc,
        sortKey: work.date ?? "",
        seriesKey: work.iterationOfWorkSlug ?? "",
      }
    })
  const fallbackImageBySeries = new Map<string, string>()

  for (const release of candidates) {
    const seriesKey = release.seriesKey
    if (seriesKey && release.imageSrc && !fallbackImageBySeries.has(seriesKey)) {
      fallbackImageBySeries.set(seriesKey, release.imageSrc)
    }
  }

  return candidates
    .map((release) => ({
      ...release,
      imageSrc:
        release.imageSrc ||
        (release.seriesKey ? fallbackImageBySeries.get(release.seriesKey) ?? "" : ""),
    }))
    .filter((release) => release.href && release.title && release.imageSrc)
    .sort((a, b) => b.sortKey!.localeCompare(a.sortKey!))
}

function MusicCard({ release }: { release: MusicRelease }) {
  const media = release.imageSrc ? (
    <img
      src={rewriteLegacyMediaUrl(release.imageSrc)}
      alt={release.title}
      className="music-card__image"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className="music-card__image music-card__image--placeholder">
      <span className="music-card__placeholder-label">
        {release.kicker ?? "Release"}
      </span>
    </div>
  )

  const title = release.href ? (
    <a
      href={release.href}
      target="_blank"
      rel="noopener noreferrer"
      className="music-card__title"
    >
      {release.title}
    </a>
  ) : (
    <span className="music-card__title music-card__title--static">{release.title}</span>
  )

  return (
    <article className="music-card">
      {release.href ? (
        <a
          href={release.href}
          target="_blank"
          rel="noopener noreferrer"
          className="music-card__media-link"
        >
          {media}
        </a>
      ) : (
        <div className="music-card__media-link music-card__media-link--static">{media}</div>
      )}

      <div className="music-card__body">{title}</div>
    </article>
  )
}

export function MusicPage() {
  const { page, loading, error } = usePage("music")
  const { works } = useWorks()
  const [detailedMusicReleases, setDetailedMusicReleases] = useState<Work[] | null>(null)

  useEffect(() => {
    if (!works) return

    const candidateSlugs = works
      .filter((work) =>
        (work.categories ?? []).some(
          (category) => category.trim().toLowerCase() === "music release",
        ),
      )
      .map((work) => work.slug)

    let active = true
    Promise.all(candidateSlugs.map((slug) => loadWorkDetail(slug)))
      .then((items) => {
        if (active) {
          setDetailedMusicReleases(items)
        }
      })
      .catch(() => {
        if (active) {
          setDetailedMusicReleases([])
        }
      })

    return () => {
      active = false
    }
  }, [works])

  const content = useMemo(
    () => (page?.bodyHtml ? parseMusicPageContent(page.bodyHtml) : null),
    [page?.bodyHtml],
  )
  const soundcloudReleases = useMemo(
    () => extractSoundcloudMusicReleases(detailedMusicReleases),
    [detailedMusicReleases],
  )
  const footerLink = content?.footerLink ?? null
  const releases = useMemo(() => {
    const base = content?.releases ?? []
    const seen = new Set(soundcloudReleases.map((release) => release.href))
    return [...soundcloudReleases, ...base.filter((release) => !seen.has(release.href))]
  }, [content?.releases, soundcloudReleases])

  if (loading) {
    return (
      <div className="page music-page">
        <p>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page music-page">
        <p>Could not load music page.</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="page music-page">
        <p>Page not found.</p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  if (releases.length === 0) {
    return (
      <div className="page work-detail music-page">
        <h1 className="music-page__title">{page.title}</h1>
        {page.bodyHtml ? (
          <div
            className="work-body"
            dangerouslySetInnerHTML={{ __html: prepareLegacyBodyHtml(page.bodyHtml) }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="page work-detail music-page">
      <h1 className="music-page__title">{page.title}</h1>

      <h2 className="music-page__section-title">Releases</h2>
      <div className="music-page__grid" aria-label="Music releases">
        {releases.map((release) => (
          <MusicCard key={`${release.href ?? release.title}-${release.title}`} release={release} />
        ))}
      </div>

      <h2 className="music-page__section-title">GEOMUSICA RELEASES</h2>
      <div className="music-page__grid" aria-label="GeoMusica releases">
        {GEOMUSICA_RELEASES.map((release) => (
          <MusicCard key={release.href ?? release.title} release={release} />
        ))}
      </div>

      {footerLink ? (
        <p className="music-page__footer-link">
          <a
            href={footerLink.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {footerLink.label}
          </a>
        </p>
      ) : null}
    </div>
  )
}
