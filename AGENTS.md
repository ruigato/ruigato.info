# AGENTS.md

This file defines how LLM agents should work in this project.

## First read

Before making changes, read:

1. `AGENTS.md`
2. `docs/PROJECT.md`
3. `README.md`
4. `web/README.md` when working on the frontend
5. The files directly related to the requested task

## Project context

`ruigato.info` is the public site and editorial archive for Rui Gato: portfolio, timeline, works, biography, music, GeoMusica context, and broader public identity. It may later also become a private or mixed central dashboard for project status across creative, work, personal, and family systems.

## Project contract

- Treat `docs/PROJECT.md` as the canonical project brief and current status file.
- Keep public editorial identity distinct from private dashboard or Second Brain material.
- Do not publish private family, finance, health, credentials, internal OCUBO/OLAB details, or unpublished project status unless explicitly requested.
- Preserve existing user changes unless the user explicitly asks to revert them.
- Follow the existing Vite/React frontend conventions in `web/`.

## Sources of truth

- Project brief: `docs/PROJECT.md`
- Local synced project template: `.agents/templates/PROJECT.md Template.md`
- Canonical project template: `/Users/ruigato/Documents/GitHub/secondBrain/Second Brain/templates/PROJECT.md Template.md`
- Frontend: `web/`
- Frontend README: `web/README.md`
- Root README: `README.md`
- Second Brain registry: `/Users/ruigato/Documents/GitHub/secondBrain/Second Brain/00 Meta/Project Registry.md`

## Development workflow

For frontend work, use the commands and conventions in `web/README.md` and `web/package.json`.

Keep generated/canonical content pipelines separate from manual editorial changes unless the task explicitly bridges them.

## Project status policy

Do not update `docs/PROJECT.md` during normal implementation. Use it as briefing/context during the session, and review it only at closeout.

When reviewing project status at closeout:

1. Read `docs/PROJECT.md` and this `AGENTS.md`.
2. Inspect recent commits, uncommitted changes, editorial pipeline changes, content/data model changes, API/dashboard changes, and frontend changes.
3. Update `docs/PROJECT.md` only if the completed session changed the site's concept, public editorial surface, dashboard/API ambitions, current status, roadmap, decisions, risks, or open questions materially.
4. Keep implementation noise out of `docs/PROJECT.md`; summarize editorial/system state and direction.
5. Never add private Second Brain or family/work-sensitive material to public-facing sections unless explicitly requested.

Recurring hygiene scans may report that `docs/PROJECT.md` appears stale, but should not rewrite it automatically unless Rui explicitly asks for a maintenance-only update.

## Second Brain integration

Relevant Second Brain area: `public/ruigato-info`.

Likely links:

- `/Users/ruigato/Documents/GitHub/secondBrain/Second Brain/00 Meta/Project Registry.md`
- `[[wiki/entities/Rui Gato]]`
- `[[wiki/sources/ruigato.info PROJECT]]`
- `[[wiki/syntheses/Trabalho de Rui Gato]]`
- `[[wiki/syntheses/Arquitectura Second Brain APIs e dashboards]]`

When `docs/PROJECT.md` is materially updated, the Second Brain aggregation should update the relevant wiki pages.

## Agent handoff notes

When finishing meaningful work, summarize:

- What changed
- What was verified
- What remains open
- Whether `docs/PROJECT.md` was updated
- Any Second Brain page that should be updated next

## Session closeout

At the end of a meaningful work session:

1. Review the working tree and summarize changed, added, removed, and generated files.
2. Run the smallest relevant verification for the work done, or explain why verification was not run.
3. Update `docs/PROJECT.md` now, and only now, if the session changed public/editorial scope, current status, architecture, API/dashboard ambitions, active fronts, roadmap, decisions, risks, or open questions.
4. Remove accidental local noise from the proposed commit scope, such as `.DS_Store`, caches, temporary files, and unrelated generated artifacts.
5. Propose a coherent commit when the work is ready, including a suggested commit message.
6. Do not commit automatically unless Rui explicitly asks for a commit.

Preferred closeout: update `docs/PROJECT.md` when needed, prepare a clean commit proposal, then wait for Rui's confirmation before committing.

## Coding discipline

For coding, debugging, refactoring, review, or technical documentation, follow `.agents/rules/coding-discipline.md`.

In short: think before coding, prefer simple implementations, make surgical changes, and verify with the smallest meaningful check.
