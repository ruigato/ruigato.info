/** Formato esperado pelo runtime `timeline-threejs` (plugin WordPress). */
export type TimelinePluginPost = {
  title: string
  /** Data ISO, com precisão de mês (YYYY-MM) ou de dia (YYYY-MM-DD). */
  date: string
  link: string
  thumbnail?: string
}

export type TimelinePluginCategory = {
  name: string
  posts: TimelinePluginPost[]
}

export type TimelinePluginData = Record<string, TimelinePluginCategory>
