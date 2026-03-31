/** Formato esperado pelo runtime `timeline-threejs` (plugin WordPress). */
export type TimelinePluginPost = {
  title: string
  /** ISO date string (YYYY-MM-DD ou mais longo; o plugin usa .slice(0,10)) */
  date: string
  link: string
  thumbnail?: string
}

export type TimelinePluginCategory = {
  name: string
  posts: TimelinePluginPost[]
}

export type TimelinePluginData = Record<string, TimelinePluginCategory>
