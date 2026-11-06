# Enterprise AI OS

An AI-native enterprise operating environment: describe a business problem, get a working
enterprise application. See [`context.md`](context.md) for the full product and architecture
context.

**Current state: Milestone 3 — Intelligence experience**, on top of the Milestone 1 desktop
foundation and the Milestone 2 Application Creation Workspace.

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
    services/      MockServicesProvider (Claims Intelligence backend stand-in, persisted),
                   app-records-store (records in published apps), demo-data (reset)
      mock/        Typed MOCK services: intent, architecture (+ AI Architect), capability analysis,
                   resource discovery, blueprint (diff, readiness), application registry,
                   activity, attention — deterministic, browser-only, replaceable by real APIs
    resources/     ResourceDetailSheet — reusable, business-first resource detail
    studio/        Application Studio: StudioProvider + pure studioReducer (stage progress,
                   downstream invalidation, version snapshots, decisions), lifecycle.ts,
                   migrate.ts (older drafts), stages/ (one per stage), components/ (nav,
                   architect panel, swimlanes, version history, lifecycle track)
    blueprint/     Application Blueprint schema (types.ts), generator + patches (generate.ts),
                   deterministic validation (validate.ts)
    experience/    ExperienceRenderer — renders blueprint pages with trusted catalogue components;
                   GeneratedAppHost — window content for every published app
    applications/  Hosted applications (claims-intelligence, document-ai, workflow-studio,
                   analytics-workspace, system-explorer incl. registry + application detail,
                   settings incl. demo-data reset, folder-browser)
  components/
    ui/            shadcn/ui primitives (unchanged)
    os/            Shared OS micro-patterns: AppIcon, StatusBadge, MockBadge, SidebarNav
  data/            MOCK fixtures, one concern per file:
                   resources.mock (single catalogue of agents, workers, connectors, services,
                   domain knowledge + worker proposals), studio-scenarios.mock (Insurance /
                   Healthcare / Banking understanding, questions, approaches, screens),
                   applications.mock (built-in app profiles), activity.mock (seed activity),
                   platform.mock (health, simulated executions, workflow definitions), claims,
                   documents, notifications, analytics
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

## Mock-driven features (Milestone 3)

Everything below is simulated in the browser; there is no backend, model or platform integration.

| Feature | Where | Behaviour |
|---|---|---|
| Intent understanding | `services/mock/intent-service.ts` | Keyword match against three scripted scenarios; evidence quotes from your own words; unmatched descriptions get an honest fallback, never a pretend understanding |
| Clarifying questions, suggestions | `studio-scenarios.mock.ts` | Deterministic per scenario; answers flow into requirements (e.g. approver role) |
| Solution approaches | `architecture-service.ts` | Three operating models per scenario; facts (people on N of M steps, new resources) are counted, never scored |
| AI Architect | `architecture-service.ts` | Scripted replies built from project state (why an approach is recommended, why a capability is required, reducing human intervention, unavailable workers, approvals), with "based on" sources and navigation actions; unscripted questions get an honest list of what it can answer |
| Capability coverage, worker composition | `capability-analysis-service.ts`, `resources.mock.ts` | Selected / Available / Requires configuration / Missing; composition is simulated (Healthcare fails once by design, then succeeds on retry) |
| Validation, readiness | `blueprint/validate.ts`, `blueprint-service.ts` | Eight deterministic checks; Ready / Needs attention / Blocked / Accepted with known gaps |
| Version history, rollback | `studioReducer.ts`, `VersionHistory.tsx`, `blueprint-service.ts` | Snapshot per version; compare by section with field-level Added / Removed / Changed highlighting; rollback creates a new draft version and only changes local prototype state |
| Registry, activity, approvals | `application-registry-service.ts`, `activity-service.ts`, `attention-service.ts` | Derived from the registry store and Studio drafts; seed events are labelled simulated |

Persisted in `localStorage` (prefix `enterprise-ai-os:`): drafts with version snapshots,
published apps, records inside published apps, Claims Intelligence decisions, recently opened
apps, widget preferences. Settings → Demo data → Reset clears them.

## Tests

Playwright smoke scripts (need the `playwright` package; not a project dependency):

```bash
npm run build && npx vite preview --port 4173 &
node e2e/desktop.cjs          # Milestone 1 desktop
node e2e/studio-journey.cjs   # Milestone 2 journey (Insurance), publish, reload, invalidation
node e2e/studio-domains.cjs   # Healthcare and Banking through validation
node e2e/intelligence.cjs     # Milestone 3 intelligence, resources, versions, registry, reset
node e2e/evolution.cjs        # Architect why-required, catalogue versions, highlighted diffs, status sort, 1440–390px
```

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui (source in `src/components/ui`) · Plus Jakarta Sans ·
lucide-react. Started from `claude-react-starter`.
