import { useEffect, useRef } from "react"
import type { Work } from "../types/content"
import type { TimelineEvent } from "../types/content"
import { buildTimelinePluginData } from "./buildTimelinePluginData"
import { mountTimelineWebGL } from "./mountTimelineWebGL"

type TimelineCanvasProps = {
  works: Work[]
  events: TimelineEvent[]
}

/** Timeline WebGL (código do plugin `timeline-threejs` + Three.js via npm). */
export function TimelineCanvas({ works, events }: TimelineCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const data = buildTimelinePluginData(works, events)
    if (Object.keys(data).length === 0) {
      return
    }

    const dispose = mountTimelineWebGL(el, data)
    return dispose
  }, [works, events])

  return <div ref={hostRef} className="timeline-canvas-host" />
}
