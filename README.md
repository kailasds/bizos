# Enterprise AI OS

An AI-native enterprise operating environment: describe a business problem, get a working
enterprise application. See [`context.md`](context.md) for the full product and architecture
context.

**Current state: Milestone 2 — Application Creation Workspace**, on top of the Milestone 1
desktop foundation (window manager, dock, launcher, widgets, notifications, mock apps).

Application Studio lets a business user describe a problem and walk it through seven
revisitable stages — Discover, Define, Architect, Compose, Generate, Validate, Publish — to a
published application that opens in its own OS window. All "intelligence" is deterministic
mock logic over fixtures; there are no backend, LLM, agent or worker integrations.

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
    registry/      Application registry: built-ins + generated apps (persisted, subscribable),
                   app-id → component map (lazy), useApplications()
    os/            OS state: windows, overlays, notifications, preferences (OsProvider, useOs)
    windows/       Pure window reducer, WindowFrame (chrome, drag, resize), WindowManager
    shell/         DesktopShell, TopBar, DesktopCanvas, Dock, ApplicationLauncher,
                   NotificationCenter, AssistantPanel
    widgets/       Desktop widgets + shared WidgetCard
    services/      MockServicesProvider — stands in for backend state shared by apps and widgets
    studio/        Application Studio: StudioProvider + pure studioReducer (stage progress,
                   downstream invalidation, revisions), services/ (mock intelligence, architect
                   guidance), stages/ (one component per stage), components/ (nav, panel, lists)
    blueprint/     Application Blueprint schema (types.ts), generator + patches (generate.ts),
                   deterministic validation (validate.ts)
    experience/    ExperienceRenderer — renders blueprint pages with trusted catalogue components;
                   GeneratedAppHost — window content for every published app
    applications/  Hosted applications (claims-intelligence, document-ai, workflow-studio,
                   analytics-workspace, system-explorer, settings, folder-browser)
  components/
    ui/            shadcn/ui primitives (unchanged)
    os/            Shared OS micro-patterns: AppIcon, StatusBadge, MockBadge, SidebarNav
  data/            Mock fixtures (claims, documents, platform, notifications, analytics,
                   studio-scenarios — Insurance/Healthcare/Banking, studio-resources — catalogue)
```

Key principles (from `context.md` §12):

- The OS shell is separate from application content; the window manager knows only window
  state and which component the registry maps an app id to.
- Applications are identified by stable ids (`AppId`), never display names.
- Mock data lives in `src/data/` and every mock surface carries a "Mock data" marker.
- Visual design is defined in `.claude/skills/frontend-kit/references/design.md` and applied
  only through CSS variables in `src/index.css`.

## Application Studio data flow

```
Discover ──interpret()──▶ interpretation ──buildRequirements()──▶ RequirementSpec (versioned)
Define   ──buildOptions()──▶ SolutionOption[] ──select──▶ Architect
Compose  ──mapCapabilities()──▶ CapabilityMapping[] (+ approved worker compositions)
Generate ──generateBlueprint()──▶ ApplicationBlueprint vX.Y.Z (+ patches, revision history)
Validate ──validateBlueprint()──▶ findings (passed / needs review / blocked)
Publish  ──registerGeneratedApp()──▶ registry → desktop, folder, launcher, window manager
```

Editing an earlier stage marks every completed later stage **Needs review** with the reason;
confirming a stage rebuilds the next artifact. Drafts and published apps persist in
`localStorage`; in-flight simulations never do, so a reload always lands on a stable state.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui (source in `src/components/ui`) ·
lucide-react. Started from `claude-react-starter`.
