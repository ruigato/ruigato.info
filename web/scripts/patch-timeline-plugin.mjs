import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rawPath = path.join(__dirname, "../src/timeline/plugin/timeline-threejs.raw.js")
const outPath = path.join(__dirname, "../src/timeline/timelinePluginRuntime.ts")

let s = fs.readFileSync(rawPath, "utf8")

// Strip BOM if present
s = s.replace(/^\uFEFF/, "")

// Remove IIFE wrapper
s = s.replace(/^\(function\(\)\{\s*/, "")
s = s.replace(/\}\)\(\);\s*$/, "")

const oldSanity = `  // —————————————————————————————————————————————
  // 3) SANITY + STYLING
  // —————————————————————————————————————————————
  if (typeof THREE === 'undefined' || typeof timelineData === 'undefined') {
    return;
  }
  const container = document.getElementById('webgl-timeline');
  if (!container) { return; }
  Object.assign(container.style, {
    position:'fixed',top:'140px',left:'0',width:'100vw',height:'100vh',margin:'0',padding:'0',
    zIndex:'100',background:'linear-gradient(to top,#333,#000,#333)'
  });
`

const newSanity = `  // 3) HOST STYLING (embedded in SPA) — viewport inteiro; header do site fica por cima (z-index)
  if (!container || !timelineData || Object.keys(timelineData).length === 0) {
    return () => {}
  }
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    maxHeight: "none",
    margin: "0",
    padding: "0",
    overflow: "hidden",
    zIndex: "1",
    background: "linear-gradient(to top,#333,#000,#333)",
  })
`

if (!s.includes(oldSanity.slice(0, 80))) {
  console.error("patch: expected SANITY block not found — raw file changed?")
  process.exit(1)
}
s = s.replace(oldSanity, newSanity)

s = s.replace(
  /Object\.assign\(wrapper\.style,\{position:'fixed',bottom:'8px',left:'0',right:'0'/,
  "Object.assign(wrapper.style,{position:'absolute',bottom:'8px',left:'0',right:'0'",
)

s = s.replace(
  "document.body.appendChild(wrapper);",
  "container.appendChild(wrapper);",
)

const brokenMove = `// ─── pointer‐move: first try arcs, else dots ────────────────────────────────
function handlePointerMove(e) {
  if (staticTooltip) return;
  updateThreshold();


  // 2) fallback to your existing dot‐hover logic:
  const hit = pickPoint(e.clientX, e.clientY);
  if (!hit) {
    if (prevHoverMesh) {
      scene.remove(prevHoverMesh);
      prevHoverMesh = null;
    }
    prevHitId = prevTipId = null;
if (!lockedArcCat) {
    clearCategoryHighlight();
    hideCategoryLabel();
    }
    hideTooltip();
    return;
  }
  const { sys, idx, point } = hit;
  const id = \`\${sys.cat}_\${idx}\`;
  if (id !== prevHitId) highlightDot(sys, idx);
  if (id !== prevTipId) {
    spawnParticles(point, sys.mesh.material.color);
    prevTipId = id;
    tooltip.innerHTML = makeHTML(sys.posts[idx], false);
 if (!lockedArcCat) {
    highlightCategory(arcCat);
    showCategoryLabel(arcCat);
    }
  }
  showTooltip();

  // 1) arc hover?
  const arcCat = pickArc(e.clientX, e.clientY);
  if (arcCat) {
    if (!lockedArcCat) {
    // highlight that category, fade others, show label
    highlightCategory(arcCat);
    showCategoryLabel(arcCat);
    }
    return;
  } else {
if (!lockedArcCat) {
    clearCategoryHighlight();
    hideCategoryLabel();
    }
  }

}`

const fixedMove = `// pointer-move: arcs first, then dots
function handlePointerMove(e) {
  if (staticTooltip) return;
  updateThreshold();

  const arcCatHover = pickArc(e.clientX, e.clientY);
  if (arcCatHover) {
    if (!lockedArcCat) {
      highlightCategory(arcCatHover);
      showCategoryLabel(arcCatHover);
    }
    hideTooltip();
    return;
  }

  if (!lockedArcCat) {
    clearCategoryHighlight();
    hideCategoryLabel();
  }

  const hit = pickPoint(e.clientX, e.clientY);
  if (!hit) {
    if (prevHoverMesh) {
      scene.remove(prevHoverMesh);
      prevHoverMesh = null;
    }
    prevHitId = prevTipId = null;
    hideTooltip();
    return;
  }

  const { sys, idx, point } = hit;
  const id = \`\${sys.cat}_\${idx}\`;
  if (id !== prevHitId) highlightDot(sys, idx);
  if (id !== prevTipId) {
    spawnParticles(point, sys.mesh.material.color);
    prevTipId = id;
    tooltip.innerHTML = makeHTML(sys.posts[idx], false);
  }
  showTooltip();
}`

if (!s.includes("// ─── pointer‐move:")) {
  console.error("patch: handlePointerMove not found")
  process.exit(1)
}
s = s.replace(brokenMove, fixedMove)

const oldBootstrap = `  // —————————————————————————————————————————————
  // 4) BOOTSTRAP
  // —————————————————————————————————————————————
  init(); animate();
`

const newBootstrap = `  // 4) BOOTSTRAP (init/animate chamados no final da função exportada)
  let rafId = 0
`

if (!s.includes("// 4) BOOTSTRAP")) {
  console.error("patch: BOOTSTRAP block not found")
  process.exit(1)
}
s = s.replace(oldBootstrap, newBootstrap)

s = s.replace(
  "function animate(){\n    requestAnimationFrame(animate);",
  "function animate(){\n    rafId = requestAnimationFrame(animate);",
)

s = s.replace(
  ".addEventListener('click', () => window.open(sys.posts[idx].link, '_blank'));",
  ".addEventListener('click', () => { window.location.href = sys.posts[idx].link });",
)

const header = `/**
 * Runtime gerado a partir de \`plugin/timeline-threejs.raw.js\` (plugin WordPress).
 * Regenerar: \`node scripts/patch-timeline-plugin.mjs\`
 */
// @ts-nocheck — código gerado a partir do JS do plugin; tipagem manual seria frágil.
import type { TimelinePluginData } from "./timelinePluginTypes"

type ThreeNamespace = typeof import("three") & {
  OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls
  Line2: typeof import("three/examples/jsm/lines/Line2.js").Line2
  LineGeometry: typeof import("three/examples/jsm/lines/LineGeometry.js").LineGeometry
  LineMaterial: typeof import("three/examples/jsm/lines/LineMaterial.js").LineMaterial
}

export function runTimelinePluginRuntime(
  THREE: ThreeNamespace,
  timelineData: TimelinePluginData,
  container: HTMLElement,
): () => void {
`

const footer = `
  function dispose() {
    cancelAnimationFrame(rafId)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("pointerdown", docClickOutside)
    if (renderer) {
      renderer.domElement.removeEventListener("pointermove", handlePointerMove)
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
      renderer.dispose()
    }
    if (controls) controls.dispose()
    container.replaceChildren()
  }

  init()
  animate()

  return dispose
}
`

fs.writeFileSync(outPath, header + s + footer, "utf8")
console.log("Wrote", outPath)
