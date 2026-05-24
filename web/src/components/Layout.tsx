import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import type { SiteNav } from "../types/content"
import siteNav from "../data/site.json"
import { useSiteLocale } from "../context/SiteLocaleContext"

const nav = siteNav as SiteNav

const brandTitle = nav.siteTitle ?? "ruigato.info"

function linkClass(active: boolean): string {
  return active ? "nav-link active" : "nav-link"
}

export function Layout() {
  const { pathname } = useLocation()
  const { locale, setLocale } = useSiteLocale()
  const timelineFullBleed = pathname === "/" || pathname === "/timeline"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [mobileMenuOpen])

  const navItems = nav.items.map((item) => {
    const portfolioActive =
      item.to === "/works" &&
      (pathname === "/works" || pathname.startsWith("/works/"))
    const isActive =
      portfolioActive ||
      (item.to !== "/works" &&
        (pathname === item.to || pathname.startsWith(item.to + "/")))

    return (
      <li
        key={item.to + item.label}
        className={isActive ? "menu-item current-menu-item" : "menu-item"}
      >
        <NavLink
          to={item.to}
          end={item.to !== "/works"}
          className={linkClass(isActive)}
          onClick={() => setMobileMenuOpen(false)}
        >
          {item.label}
        </NavLink>
      </li>
    )
  })

  return (
    <div
      className={
        timelineFullBleed
          ? "app-shell app-shell--timeline-fullbleed"
          : "app-shell"
      }
    >
      <header className="site-header" id="masthead">
        <div className="site-header-inner header-bottom">
          <NavLink to="/" className="site-branding brand" end>
            <p className="site-title brand-title">{brandTitle}</p>
            {nav.tagline ? (
              <p className="site-description brand-tagline">{nav.tagline}</p>
            ) : null}
          </NavLink>
          <button
            type="button"
            className={
              mobileMenuOpen
                ? "mobile-menu-toggle mobile-menu-toggle--open"
                : "mobile-menu-toggle"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={
              mobileMenuOpen
                ? locale === "pt"
                  ? "Fechar menu"
                  : "Close menu"
                : locale === "pt"
                  ? "Abrir menu"
                  : "Open menu"
            }
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="mobile-menu-toggle__label">Menu</span>
            <span className="mobile-menu-toggle__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <nav
            className="main-navigation site-nav"
            aria-label="Principal"
          >
            <ul id="primary-menu" className="primary-menu-list">{navItems}</ul>
          </nav>
          <div
            className="locale-switcher"
            role="group"
            aria-label={locale === "pt" ? "Seleccionar língua" : "Select language"}
          >
            <button
              type="button"
              className={
                locale === "en"
                  ? "locale-switcher__btn locale-switcher__btn--active"
                  : "locale-switcher__btn"
              }
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={
                locale === "pt"
                  ? "locale-switcher__btn locale-switcher__btn--active"
                  : "locale-switcher__btn"
              }
              onClick={() => setLocale("pt")}
            >
              PT
            </button>
          </div>
        </div>
        <div
          id="mobile-menu-panel"
          className={
            mobileMenuOpen ? "mobile-menu-panel mobile-menu-panel--open" : "mobile-menu-panel"
          }
          aria-hidden={!mobileMenuOpen}
        >
          <div className="mobile-menu-panel__inner">
            <div className="mobile-menu-panel__top">
              <p className="mobile-menu-panel__eyebrow">{brandTitle}</p>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                {locale === "pt" ? "Fechar" : "Close"}
              </button>
            </div>
            <nav className="mobile-menu-nav" aria-label="Mobile">
              <ul className="mobile-menu-list">{navItems}</ul>
            </nav>
            <div
              className="locale-switcher locale-switcher--mobile"
              role="group"
              aria-label={locale === "pt" ? "Seleccionar língua" : "Select language"}
            >
              <button
                type="button"
                className={
                  locale === "en"
                    ? "locale-switcher__btn locale-switcher__btn--active"
                    : "locale-switcher__btn"
                }
                onClick={() => setLocale("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={
                  locale === "pt"
                    ? "locale-switcher__btn locale-switcher__btn--active"
                    : "locale-switcher__btn"
                }
                onClick={() => setLocale("pt")}
              >
                PT
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer
        className={
          timelineFullBleed ? "site-footer site-footer--hidden" : "site-footer"
        }
      >
        <span>Rui Gato · ruigato.info</span>
      </footer>
    </div>
  )
}
