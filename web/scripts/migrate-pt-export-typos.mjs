/**
 * Migração única: corrige no disco strings repetidas do export WordPress
 * (acentos trocados). Idempotente — voltar a correr não altera ficheiros já corrigidos.
 *
 * Uso (a partir da pasta web/):
 *   node scripts/migrate-pt-export-typos.mjs
 *
 * Seco (só listar alterações):
 *   node scripts/migrate-pt-export-typos.mjs --dry-run
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const dryRun = process.argv.includes("--dry-run")

/** Ordem: frases mais longas primeiro quando houver sobreposição. */
const REPLACEMENTS = [
  ["Sílvia de Sí", "Sílvia de Sá"],
  ["Silvia de Sí", "Silvia de Sá"],
  ["José álvaro Correia", "José Álvaro Correia"],
  ["controlo lúminico", "controlo lumínico"],
  ["matemígicas", "matemágicas"],
  ["Estídio", "Estádio"],
]

function migrateText(content) {
  let out = content
  for (const [wrong, right] of REPLACEMENTS) {
    if (out.includes(wrong)) out = out.split(wrong).join(right)
  }
  return out
}

function collectFilesRecursive(dir, predicate, acc) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) collectFilesRecursive(p, predicate, acc)
    else if (ent.isFile() && predicate(p)) acc.push(p)
  }
}

function processFile(absPath) {
  const before = fs.readFileSync(absPath, "utf8")
  const after = migrateText(before)
  if (before === after) return 0
  const rel = path.relative(root, absPath)
  if (dryRun) {
    console.log(`[dry-run] alteraria: ${rel}`)
    return 1
  }
  fs.writeFileSync(absPath, after, "utf8")
  console.log(`gravado: ${rel}`)
  return 1
}

const targets = []

collectFilesRecursive(
  path.join(root, "public/data/canonical"),
  (p) => p.endsWith(".json"),
  targets,
)

for (const sub of ["worksTextTranslationSources", "worksTextTranslations"]) {
  collectFilesRecursive(
    path.join(root, "src/data", sub),
    (p) => p.endsWith(".json"),
    targets,
  )
}

for (const rel of [
  "src/data/pages.json",
  "src/data/works.json",
  "src/data/worksCanonical.json",
  "src/data/worksArchivedUncategorized.json",
]) {
  const abs = path.join(root, rel)
  if (fs.existsSync(abs)) targets.push(abs)
}

const geomusicaTs = path.join(root, "src/data/geomusicaPageContent.ts")
if (fs.existsSync(geomusicaTs)) targets.push(geomusicaTs)

let changed = 0
for (const f of targets) changed += processFile(f)

console.log(
  dryRun
    ? `--dry-run: ${changed} ficheiro(s) conteriam substituições.`
    : `Concluído: ${changed} ficheiro(s) actualizados.`,
)
