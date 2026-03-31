import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { AboutPage } from "./pages/AboutPage"
import { ExportedPageRoute } from "./pages/ExportedPageRoute"
import { HomePage } from "./pages/HomePage"
import { WorkDetailPage } from "./pages/WorkDetailPage"
import { WorksPage } from "./pages/WorksPage"

const TimelinePage = lazy(async () => {
  const m = await import("./pages/TimelinePage")
  return { default: m.TimelinePage }
})

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
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/works" element={<WorksPage />} />
        <Route path="/works/:slug" element={<WorkDetailPage />} />
        <Route path="/p/works" element={<WorksPage highlightedOnly />} />
        <Route path="/p/:slug" element={<ExportedPageRoute />} />
        <Route path="/timeline" element={<TimelineRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
