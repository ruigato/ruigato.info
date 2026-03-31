import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import type { TimelinePluginData } from "./timelinePluginTypes"
import { runTimelinePluginRuntime } from "./timelinePluginRuntime"

type ThreeNS = typeof THREE & {
  OrbitControls: typeof OrbitControls
  Line2: typeof Line2
  LineGeometry: typeof LineGeometry
  LineMaterial: typeof LineMaterial
}

/** O namespace `import * as THREE` é não extensível; o plugin precisa de OrbitControls/Line2 no mesmo objecto. */
const threeNs = {
  ...THREE,
  OrbitControls,
  Line2,
  LineGeometry,
  LineMaterial,
} as ThreeNS

export function mountTimelineWebGL(
  container: HTMLElement,
  timelineData: TimelinePluginData,
): () => void {
  return runTimelinePluginRuntime(threeNs, timelineData, container)
}
