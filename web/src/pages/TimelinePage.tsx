import { useEffect, useState } from "react"
import type { TimelineEvent } from "../types/content"
import type { Work } from "../types/content"
import { loadWorks } from "../lib/works"
import { TimelineCanvas } from "../timeline/TimelineCanvas"

export function TimelinePage() {
  const [works, setWorks] = useState<Work[] | null>(null)
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      loadWorks(),
      import("../data/timeline-events.json"),
    ]).then(([wList, eMod]) => {
      if (!active) return
      setWorks(wList)
      setEvents(eMod.default as TimelineEvent[])
    })
    return () => {
      active = false
    }
  }, [])

  if (!works || !events) {
    return (
      <div className="timeline-page timeline-page--fullbleed">
        <p className="timeline-loading-msg">A carregar timeline…</p>
      </div>
    )
  }

  return (
    <div className="timeline-page timeline-page--fullbleed">
      <h1 className="sr-only">Timeline</h1>
      <TimelineCanvas works={works} events={events} />
    </div>
  )
}
