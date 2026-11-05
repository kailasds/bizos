# Enterprise AI OS

An AI-native enterprise operating environment: describe a business problem, get a working
enterprise application. See [`context.md`](context.md) for the full product and architecture
context.

**Current state: Phase 1, Milestone 1 — Desktop foundation.** A frontend-only desktop shell
with a window manager, dock, launcher, widgets, notifications and mock applications.
All data is mock data; there are no backend, LLM, agent or worker integrations yet.

## Getting started

```bash
npm install
npm run dev
```

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — lint with oxlint
- `npm run preview` — preview the production build

## Architecture

```
src/
  app/
    registry/      Application registry (metadata) + app-id → component map (lazy)
    os/            OS state: windows, overlays, notifications, preferences (OsProvider, useOs)
    windows/       Pure window reducer, WindowFrame (chrome, drag, resize), WindowManager
    shell/         DesktopShell, TopBar, DesktopCanvas, Dock, ApplicationLauncher,
                   NotificationCenter, AssistantPanel
    widgets/       Desktop widgets + shared WidgetCard
    services/      MockServicesProvider — stands in for backend state shared by apps and widgets
    applications/  Hosted applications (claims-intelligence, document-ai, workflow-studio,
                   analytics-workspace, system-explorer, settings, folder-browser)
  components/
    ui/            shadcn/ui primitives (unchanged)
    os/            Shared OS micro-patterns: AppIcon, StatusBadge, MockBadge, SidebarNav
  data/            Mock fixtures (claims, documents, platform, notifications, analytics)
```

Key principles (from `context.md` §12):

- The OS shell is separate from application content; the window manager knows only window
  state and which component the registry maps an app id to.
- Applications are identified by stable ids (`AppId`), never display names.
- Mock data lives in `src/data/` and every mock surface carries a "Mock data" marker.
- Visual design is defined in `.claude/skills/frontend-kit/references/design.md` and applied
  only through CSS variables in `src/index.css`.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui (source in `src/components/ui`) ·
lucide-react. Started from `claude-react-starter`.
