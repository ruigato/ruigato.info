#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const canonicalPath = path.join(root, "src/data/worksCanonical.json")
const outDir = path.join(root, "src/data/worksTextTranslationSources")
const batchCount = 4

main()

function main() {
  const works = JSON.parse(fs.readFileSync(canonicalPath, "utf8"))
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  const items = works.map((work) => {
    const descriptions = work.descriptions ?? []
    const ptDescription = descriptions.find(
      (item) => item.locale === "pt" && item.kind === "description",
    )
    const enDescription = descriptions.find(
      (item) => item.locale === "en" && item.kind === "description",
    )

    return {
      slug: work.slug,
      title: work.title,
      summary_source_locale: detectLocale(work.summary ?? ""),
      summary_source_text: work.summary ?? "",
      description_source_locale:
        ptDescription && !ptDescription.generated_from_locale
          ? "pt"
          : enDescription && !enDescription.generated_from_locale
            ? "en"
            : null,
      description_source_text:
        ptDescription && !ptDescription.generated_from_locale
          ? ptDescription.content
          : enDescription && !enDescription.generated_from_locale
            ? enDescription.content
            : null,
      needs_description_translation: Boolean(
        (ptDescription && ptDescription.generated_from_locale) ||
          (enDescription && enDescription.generated_from_locale),
      ),
    }
  })

  const size = Math.ceil(items.length / batchCount)
  for (let index = 0; index < batchCount; index++) {
    const batch = items.slice(index * size, (index + 1) * size)
    fs.writeFileSync(
      path.join(outDir, `batch-${index + 1}.json`),
      JSON.stringify(batch, null, 2) + "\n",
      "utf8",
    )
  }

  console.log(`Translation source batches: ${batchCount}`)
  console.log(`Output: ${path.relative(root, outDir)}`)
}

function detectLocale(text) {
  const sample = comparable(text)
  const ptHits =
    (sample.match(/\b(com|para|obra|instalacao|projecto|companhia|musica|som|uma|foi|em)\b/gu) ?? []).length +
    ((text ?? "").match(/[ãáàçõéêíóôú]/gu) ?? []).length
  const enHits =
    (sample.match(/\b(the|with|for|project|installation|music|sound|live|made|performed|during|show)\b/gu) ?? []).length
  return ptHits >= enHits ? "pt" : "en"
}

function comparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}
