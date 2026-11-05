# CLAUDE.md

This repository is the **Enterprise AI OS** frontend (built on the claude-react-starter foundation). Read `context.md` before product, UX or architecture work — it is the shared product context. Current scope: Phase 1 desktop shell with mock data only (no backend, LLM, agent or worker integrations).

## Architecture rules

- Application metadata lives in `src/app/registry/applicationRegistry.ts`; the id → component map is `applicationComponents.ts`. Add an app by registering it in both — never hardcode a window/modal per app.
- Window state is a pure reducer (`src/app/windows/windowReducer.ts`); shell components talk to it only through `useOs()`.
- Mock data lives in `src/data/*.mock.ts`. Any surface showing fabricated data must carry `MockBadge` (or sit in a container that does).
- Status is always shown with the shared `StatusBadge` (`src/components/os/`).
- Every visible control must work; if a feature is out of scope, omit the control or label it clearly as a placeholder.

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