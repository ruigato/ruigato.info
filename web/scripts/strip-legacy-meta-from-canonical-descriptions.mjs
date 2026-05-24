/**
 * Remove blocos legados `name:` / `date:` / … das entradas `descriptions[].content`
 * (export WordPress colado no texto plano). Idempotente.
 *
 * Mantém linhas que não são meta reconhecida (alinhado com workSchema META_LABELS
 * + description pt/en).
 *
 * Uso (pasta web/):
 *   node scripts/strip-legacy-meta-from-canonical-descriptions.mjs
 *   node scripts/strip-legacy-meta-from-canonical-descriptions.mjs --dry-run
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const dryRun = process.argv.includes("--dry-run")

const META_LABELS = new Set([
  "name",
  "date",
  "type",
  "event",
  "city",
  "place",
  "location",
  "client",
  "collaboration",
  "description pt",
  "description en",
])

function normalizeComparable(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

function normalizeKey(value) {
  return normalizeComparable(value).replace(/\s+/gu, " ")
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
}

function cleanText(text) {
  return decodeEntities(text)
    .replace(/\u00a0/gu, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim()
}

/** Igual a peelMetaLines em workSchema.ts — linha a linha. */
function stripLegacyMetaBlock(block) {
  const remaining = []
  for (const line of block.split(/\n+/u)) {
    const match = line.match(/^([^:]+):\s*(.+)$/u)
    if (!match) {
      remaining.push(line)
      continue
    }
    const label = normalizeKey(match[1])
    if (META_LABELS.has(label)) continue
    remaining.push(line)
  }
  return cleanText(remaining.join("\n"))
}

function looksLikeDumpedMetaInDescription(content) {
  if (typeof content !== "string") return false
  return /\nname:\s/m.test(content) || /^name:\s/m.test(content.trim())
}

function summaryNeedsClearing(summary, summaryLocalized) {
  if (typeof summary !== "string") return false
  if (!/\bname:\s/.test(summary)) return false
  if (summaryLocalized && (summaryLocalized.pt || summaryLocalized.en)) return true
  return false
}

function processWorkJson(absPath) {
  const raw = fs.readFileSync(absPath, "utf8")
  const data = JSON.parse(raw)
  let touched = false

  if (Array.isArray(data.descriptions)) {
    for (const block of data.descriptions) {
      if (block?.kind !== "description" || typeof block.content !== "string") continue
      if (!looksLikeDumpedMetaInDescription(block.content)) continue
      const next = stripLegacyMetaBlock(block.content)
      if (next !== block.content) {
        block.content = next
        touched = true
      }
    }
  }

  if (summaryNeedsClearing(data.summary, data.summary_localized)) {
    data.summary = null
    touched = true
  }

  if (!touched) return 0
  const rel = path.relative(root, absPath)
  if (dryRun) {
    console.log(`[dry-run] alteraria: ${rel}`)
    return 1
  }
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  console.log(`gravado: ${rel}`)
  return 1
}

function walkJson(dir, acc) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkJson(p, acc)
    else if (ent.isFile() && ent.name.endsWith(".json")) acc.push(p)
  }
}

const workFiles = []
walkJson(path.join(root, "public/data/canonical/works"), workFiles)

let n = 0
for (const f of workFiles) n += processWorkJson(f)

console.log(
  dryRun
    ? `--dry-run: ${n} ficheiro(s).`
    : `Concluído: ${n} ficheiro(s) actualizados.`,
)
