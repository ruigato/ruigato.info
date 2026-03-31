import { NavLink, Outlet, useLocation } from "react-router-dom"
import type { SiteNav } from "../types/content"
import siteNav from "../data/site.json"

const nav = siteNav as SiteNav

const brandTitle = nav.siteTitle ?? "ruigato.info"

function linkClass(active: boolean): string {
  return active ? "nav-link active" : "nav-link"
}

export function Layout() {
  const { pathname } = useLocation()
  const timelineFullBleed = pathname === "/timeline"

  return (
    <div
      className={
        timelineFullBleed
          ? "app-shell app-shell--timeline-fullbleed"
          : "app-shell"
      }
    >
      <header
        className={
          timelineFullBleed
            ? "site-header site-header--timeline-overlay"
            : "site-header"
        }
        id="masthead"
      >
        <div className="site-header-inner header-bottom">
          <NavLink to="/" className="site-branding brand" end>
            <p className="site-title brand-title">{brandTitle}</p>
            {nav.tagline ? (
              <p className="site-description brand-tagline">{nav.tagline}</p>
            ) : null}
          </NavLink>
          <nav
            className="main-navigation site-nav"
            aria-label="Principal"
          >
            <ul id="primary-menu" className="primary-menu-list">
              {nav.items.map((item) => {
                const portfolioActive =
                  item.to === "/works" &&
                  (pathname === "/works" || pathname.startsWith("/works/"))
                const isActive =
                  portfolioActive ||
                  (item.to !== "/works" &&
                    (pathname === item.to ||
                      pathname.startsWith(item.to + "/")))
                return (
                  <li
                    key={item.to + item.label}
                    className={
                      isActive ? "menu-item current-menu-item" : "menu-item"
                    }
                  >
                    <NavLink
                      to={item.to}
                      end={item.to !== "/works"}
                      className={linkClass(isActive)}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
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
