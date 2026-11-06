# CLAUDE.md

This repository is the **Enterprise AI OS** frontend (built on the claude-react-starter foundation). Read `HANDOFF.md` first (project state, history, code map, next steps), then `context.md` before product, UX or architecture work — it is the shared product context. Current scope: desktop shell, Application Studio, the intelligence experience (Milestone 3) and the simulated operational runtime (Milestone 4: executions, approvals, audit, outcomes, learning) — mock data and deterministic mock intelligence only (no backend, LLM, agent or worker integrations).

## Architecture rules

- Application metadata lives in `src/app/registry/applicationRegistry.ts`; the id → component map is `applicationComponents.ts`. Add an app by registering it in both — never hardcode a window/modal per app.
- Window state is a pure reducer (`src/app/windows/windowReducer.ts`); shell components talk to it only through `useOs()`.
- Mock data lives in `src/data/*.mock.ts` (one concern per file; `resources.mock.ts` is the only resource catalogue). The UI shows no mock/prototype tags (removed at the product owner's request); keep that data clearly separated in `src/data` instead.
- Simulated intelligence lives in typed services under `src/app/services/mock/` — UI never hardcodes scenario logic. Services must stay deterministic, must not claim a model understood something, and must not invent metrics, percentages or validation findings.
- The OS reads platform resources (agents, workers, connectors, domain packs); it is not their registry. Registry, activity and approvals views are derived from the registry store and Studio projects — never a second copy.
- Status is always shown with the shared `StatusBadge` (`src/components/os/`).
- Every visible control must work; if a feature is out of scope, omit the control or label it clearly as a placeholder.
- Generated applications are data, not code: the Application Blueprint (`src/app/blueprint/types.ts`) is the source of truth and `ExperienceRenderer` interprets it with trusted components. Never generate or execute code.
- Studio state changes go through `studioReducer` actions. A change to an earlier stage must invalidate later stages (`invalidateAfter`), never silently rewrite them.
- Operational records (executions, approvals, audit, outcomes, learning signals, proposals) live only in the runtime store (`src/app/runtime/store.ts`) and change only through engine transitions. Audit events and the activity stream are written by those transitions — never fabricated separately. Operational views derive counts from these records; no invented rates or KPIs.
- A published application's blueprint never changes silently: improvements create a draft version that must be checked and published. In Studio the checks run automatically on Publish, which shows only the items needing a decision; there is no separate validation step.
- Application Studio is themed with the scoped `.theme-studio` class in `src/index.css` (the OS colour theme as a pale wash, floating liquid glass, soft blue tiles, no dark fills; `design.md` §10). Its screens are pictorial: at most 1–2 lines of text per block, tiles and diagrams first. Reasoning and explanations sit behind `InfoTip` (`src/components/os/InfoTip.tsx`) or expanders, not inline paragraphs.
- The chain of thought is drawn from project facts: `ThinkingChain` while the OS works, `ThoughtStrip` on each level (`services/mock/thought-chain-service.ts`). Never invent a link.
- Flow canvases (Architect, Compose, Generate) use React Flow (`@xyflow/react`, MIT). Rebuilt nodes must keep `measured`, or the library hides them until it measures again.
- Window content is a container-query context (`@container` on the window body); size app layouts with `@…:` variants, not viewport breakpoints.

## Stack

- React + Vite + TypeScript
- Tailwind CSS for styling
- shadcn/ui components, already installed as source code (not an npm package)
- Lucide as the icon library

## Conventions

- shadcn/ui components live in `src/components/ui` — reuse them instead of installing another UI component library.
- Shared utilities live in `src/lib`.
- The `@/*` import alias resolves to `src/*` (configured in `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`).
- Do not modify or replace the shadcn architecture (`components.json`, the `src/components/ui` structure, the alias setup) unnecessarily.

## Commands

- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run lint` — lint with oxlint




## UI work (frontend-kit)

This project's UI follows `.claude/skills/frontend-kit`. Read `.claude/skills/frontend-kit/SKILL.md` before building or editing any UI.

- **How it's built** (React + shadcn/ui, file layout, component conventions, the token bridge) is fixed and lives in `.claude/skills/frontend-kit/references/engineering.md`. Before scaffolding anything, check whether a compatible engineering foundation already exists in this project — see engineering.md's detection section. If one exists, don't scaffold, reinstall, or restructure it.
- **What it looks like** (colors, type, radius, spacing, component styling) is specific to this project and lives in `.claude/skills/frontend-kit/references/design.md`, generated from a reference image via `/extract-design`.

If `design.md` still says NOT YET EXTRACTED, run `/extract-design` before building any styled UI.