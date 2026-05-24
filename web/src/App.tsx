import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useParams } from "react-router-dom"
import { Layout } from "./components/Layout"
import { AboutPage } from "./pages/AboutPage"
import { ExportedPageRoute } from "./pages/ExportedPageRoute"
import { GeoMusicaPage } from "./pages/GeoMusicaPage"
import { HomePage } from "./pages/HomePage"
import { MusicPage } from "./pages/MusicPage"
import { WorkDetailPage } from "./pages/WorkDetailPage"
import { WorksPage } from "./pages/WorksPage"
import { SiteLocaleProvider } from "./context/SiteLocaleContext"
import { WorkEditorAuthProvider } from "./context/WorkEditorAuthProvider"

const TimelinePage = lazy(async () => {
  const m = await import("./pages/TimelinePage")
  return { default: m.TimelinePage }
})

function WorkDetailRoute() {
  const { slug } = useParams()
  return <WorkDetailPage key={slug ?? ""} />
}

function TimelineRoute() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <p>A carregar timeline…</p>
        </div>
      }
    >
      <TimelinePage />
    </Suspense>
  )
}

export default function App() {
  return (
    <SiteLocaleProvider>
      <WorkEditorAuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TimelineRoute />} />
          <Route path="/timeline" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/:slug" element={<WorkDetailRoute />} />
          <Route path="/p/works" element={<WorksPage highlightedOnly />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/geomusica" element={<GeoMusicaPage />} />
          <Route path="/p/:slug" element={<ExportedPageRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </WorkEditorAuthProvider>
    </SiteLocaleProvider>
  )
}
