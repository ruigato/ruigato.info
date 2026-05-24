import fs from "node:fs/promises"
import path from "node:path"
import type { Connect, Plugin } from "vite"
import type { CanonicalWork } from "../lib/canonicalWorks"
import {
  buildIndexEntryPatch,
  mergeIndexEntry,
} from "../lib/patchWorksIndex"

const API_PATH = "/__api/save-canonical-work"

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)
}

async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString("utf8")
  if (!raw.trim()) return null
  return JSON.parse(raw) as unknown
}

export function saveCanonicalWorkPlugin(editorSecret: string): Plugin {
  const secret = editorSecret.trim()
  if (!secret) {
    return { name: "save-canonical-work-disabled" }
  }

  return {
    name: "save-canonical-work",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== API_PATH || req.method !== "POST") {
          next()
          return
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8")

        let body: unknown
        try {
          body = await readJsonBody(req)
        } catch {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }))
          return
        }

        if (
          !body ||
          typeof body !== "object" ||
          !("secret" in body) ||
          !("slug" in body) ||
          !("canonical" in body)
        ) {
          res.statusCode = 400
          res.end(
            JSON.stringify({
              ok: false,
              error: "Expected { secret, slug, canonical }",
            }),
          )
          return
        }

        const rec = body as Record<string, unknown>
        if (typeof rec.secret !== "string" || rec.secret !== secret) {
          res.statusCode = 403
          res.end(JSON.stringify({ ok: false, error: "Forbidden" }))
          return
        }

        const slug = typeof rec.slug === "string" ? rec.slug : ""
        if (!isSafeSlug(slug)) {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: "Invalid slug" }))
          return
        }

        const canonical = rec.canonical as CanonicalWork & { id?: string }
        if (!canonical || typeof canonical !== "object") {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: "Invalid canonical" }))
          return
        }

        const root = server.config.root
        const workPath = path.join(
          root,
          "public",
          "data",
          "canonical",
          "works",
          `${slug}.json`,
        )
        const indexPath = path.join(
          root,
          "public",
          "data",
          "canonical",
          "works-index.json",
        )

        try {
          const json = `${JSON.stringify(canonical, null, 2)}\n`
          await fs.writeFile(workPath, json, "utf8")

          const indexRaw = await fs.readFile(indexPath, "utf8")
          const indexList = JSON.parse(indexRaw) as unknown[]
          if (!Array.isArray(indexList)) {
            throw new Error("works-index.json is not an array")
          }
          const patch = buildIndexEntryPatch(canonical)
          let found = false
          const next = indexList.map((entry) => {
            if (!entry || typeof entry !== "object") return entry
            const e = entry as Record<string, unknown>
            if (e.slug === slug) {
              found = true
              return mergeIndexEntry(e, patch)
            }
            return entry
          })
          if (!found) {
            res.statusCode = 404
            res.end(
              JSON.stringify({
                ok: false,
                error: `Slug "${slug}" not found in works-index.json`,
              }),
            )
            return
          }
          await fs.writeFile(
            indexPath,
            `${JSON.stringify(next, null, 2)}\n`,
            "utf8",
          )

          res.statusCode = 200
          res.end(JSON.stringify({ ok: true }))
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: msg }))
        }
      })
    },
  }
}
