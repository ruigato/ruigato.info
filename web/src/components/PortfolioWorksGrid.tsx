import { useLayoutEffect, useMemo, useRef, type MouseEvent } from "react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import Flip from "gsap/flip.js"
import type { Work } from "../types/content"
import { rewriteLegacyMediaUrl } from "../lib/legacyHtml"

gsap.registerPlugin(Flip)

type PortfolioWorksGridProps = {
  works: Work[]
  onMouseDownLink: (e: MouseEvent<HTMLElement>) => void
  /** Quando false, esconde thumbs em todos os cartões (só títulos). */
  showThumbs?: boolean
  /** Liga à ficha com `?highlighted=1` para navegação anterior/seguinte só nas obras em destaque. */
  highlightedWorksNav?: boolean
}

function layoutSignature(works: Work[], showThumbs: boolean): string {
  return works.map((w) => w.slug).join("|") + "#" + (showThumbs ? "1" : "0")
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/**
 * Grelha tipo The Grid: FLIP nos cartões que permanecem (mudam de sítio na grelha) e,
 * em paralelo, saídas com opacity + scale → 0; entradas com scale 0 → 1.
 */
export function PortfolioWorksGrid({
  works,
  onMouseDownLink,
  showThumbs = true,
  highlightedWorksNav = false,
}: PortfolioWorksGridProps) {
  const gridRef = useRef<HTMLUListElement>(null)
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null)
  const sig = useMemo(
    () => layoutSignature(works, showThumbs),
    [works, showThumbs],
  )

  useLayoutEffect(() => {
    const root = gridRef.current
    if (!root) return

    const targets = root.querySelectorAll<HTMLElement>(".pg-item")
    if (targets.length === 0) {
      flipStateRef.current = null
      return
    }

    if (prefersReducedMotion()) {
      gsap.set(targets, { clearProps: "opacity,transform" })
      flipStateRef.current = Flip.getState(targets, { simple: true })
      return
    }

    const prev = flipStateRef.current

    if (prev) {
      Flip.killFlipsOf(".pg-item")

      Flip.from(prev, {
        duration: 0.56,
        ease: "power2.inOut",
        absolute: true,
        nested: true,
        prune: true,
        stagger: 0.022,
        onEnter: (elements: Element[]) => {
          gsap.fromTo(
            elements,
            {
              opacity: 0,
              scale: 0,
              transformOrigin: "50% 50%",
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.42,
              stagger: 0.03,
              ease: "power3.out",
              overwrite: "auto",
            },
          )
        },
        onLeave: (elements: Element[]) => {
          gsap.to(elements, {
            opacity: 0,
            scale: 0,
            transformOrigin: "50% 50%",
            duration: 0.32,
            stagger: 0.016,
            ease: "power2.in",
            overwrite: "auto",
          })
        },
        onComplete: () => {
          const next = gridRef.current?.querySelectorAll<HTMLElement>(
            ".pg-item",
          )
          if (next && next.length > 0) {
            flipStateRef.current = Flip.getState(next, { simple: true })
          }
        },
      })
    } else {
      flipStateRef.current = Flip.getState(targets, { simple: true })
    }
  }, [sig])

  return (
    <ul ref={gridRef} className="pg-grid">
      {works.map((w) => {
        const mediaUrl = w.featuredImageThumb ?? w.featuredImage
        const hasMedia = Boolean(mediaUrl)
        const showMedia = hasMedia && showThumbs
        const compactCard = !showMedia
        return (
          <li
            key={w.slug}
            className={
              compactCard ? "pg-item pg-item--no-media" : "pg-item"
            }
            data-flip-id={w.slug}
          >
            <Link
              to={
                highlightedWorksNav
                  ? `/works/${w.slug}?highlighted=1`
                  : `/works/${w.slug}`
              }
              className="pg-item-link"
              discover="none"
              onMouseDown={onMouseDownLink}
            >
              {showMedia && mediaUrl ? (
                <div className="pg-item-media">
                  <img
                    className="pg-item-img"
                    src={rewriteLegacyMediaUrl(mediaUrl)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={512}
                    height={170}
                  />
                  {w.date ? (
                    <div className="pg-item-overlay">
                      <time className="pg-item-date" dateTime={w.date}>
                        {w.date}
                      </time>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="pg-item-content-holder">
                <div className="pg-item-accent" aria-hidden />
                <div className="pg-item-title-bar">
                  <span className="pg-item-title-below">{w.title}</span>
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
