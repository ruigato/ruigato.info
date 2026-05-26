---
template: coding-agent-discipline
version: 1
created: 2026-05-26
updated: 2026-05-26
source: multica-ai/andrej-karpathy-skills
---

# Coding Agent Discipline

This rule is for LLM agents doing programming, debugging, refactoring, review, or technical documentation in Rui's projects.

It adapts the Karpathy-inspired guidelines for this project system: think before coding, keep changes simple, edit surgically, and define verifiable success criteria.

## When to apply

Apply this for any non-trivial coding task.

For tiny one-line fixes, use judgment, but still avoid unrelated changes.

## 1. Think before coding

Before editing files:

- Restate the goal in practical terms.
- Identify the likely files and systems involved.
- State assumptions when they matter.
- If there are multiple plausible interpretations, surface them before choosing.
- Ask Rui when ambiguity could cause wasted work or data loss.
- Push back when a simpler or safer approach is clearly better.

Do not hide confusion by guessing.

## 2. Simplicity first

Use the smallest design that solves the current problem.

- Do not add features beyond the request.
- Do not add abstractions for single-use code.
- Do not add configurability unless the project already needs it.
- Do not add defensive machinery for impossible scenarios.
- Prefer boring, local, readable code over clever generality.
- If the solution feels inflated, simplify before presenting it.

## 3. Surgical changes

Touch only what the task requires.

- Match existing project style, framework choices, naming, and file layout.
- Do not refactor adjacent code opportunistically.
- Do not rewrite comments, formatting, or APIs you do not need to touch.
- If unrelated dead code or design debt is noticed, mention it separately instead of changing it.
- Clean up imports, variables, files, and generated artifacts only when your change made them obsolete.
- Preserve user changes and local work.

Every changed line should be explainable from the user's request or the verification needed to satisfy it.

## 4. Goal-driven execution

Turn requests into verifiable outcomes.

For meaningful work, define:

- Success criteria.
- The smallest useful implementation path.
- The check that proves the work is done.

Examples:

- Bug fix: reproduce or explain the failure, fix it, then run the smallest relevant check.
- Validation: cover invalid and valid cases, then verify behavior.
- Refactor: establish behavior before and after, then keep the diff focused.
- UI change: verify layout and interaction in the relevant viewport when practical.

## Verification

Run the smallest meaningful check first:

- unit test for local logic;
- integration or API check for cross-boundary behavior;
- typecheck/lint/build for shared frontend or typed code;
- manual or browser check for UI behavior;
- syntax check for scripts and config.

If a check cannot run, say why and describe the remaining risk.

## Project memory

During implementation, use `PROJECT.md` as briefing/context. Do not rewrite it continuously.

At session closeout, update `PROJECT.md` only if the completed work changed material project state: purpose, architecture, API/dashboard surface, active fronts, roadmap, decisions, risks, or open questions.

## Handoff

At the end of meaningful work, report:

- what changed;
- what was verified;
- what remains open;
- whether `PROJECT.md` was updated;
- suggested commit scope and message when a commit is appropriate.
