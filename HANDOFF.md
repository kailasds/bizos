# HANDOFF — Enterprise AI OS (frontend prototype)

**Purpose of this file:** everything a new contributor (or a new AI thread) needs to continue
development without the previous conversation history. Read this first, then `CLAUDE.md`
(binding rules) and `context.md` (full product vision). Snapshot date: 2026-11-06.

- **Repository:** `kailasds/bizos`
- **Working branch so far:** `claude/brave-darwin-cm9c4a` (all work below lives here)
- **State:** Milestones 1–4 are done, plus two rounds of shell/visual polish. `npm run build`
  passes. `npm run lint` passes, with three warnings, all inside untouched shadcn files under
  `src/components/ui`.

---

## 1. What the product is

**Enterprise AI OS** is an *AI-native enterprise operating environment*. The promise:

> **Describe a business problem. Get a working enterprise application.**

A business user types a problem in natural language (e.g. "we need to process insurance claims
faster with fraud checks"). The OS then:

1. works out the intent and domain,
2. turns it into a requirement specification,
3. proposes alternative solution architectures,
4. finds the agents, workers, connectors and knowledge the solution needs, and spots gaps,
5. compiles a versioned **Application Blueprint**,
6. generates the app's UI from trusted components,
7. validates it, publishes it to the desktop, runs it, and governs and improves it.

It is **not** a low-code builder (the user doesn't configure screens or flows) and **not** a
kernel OS. It is a desktop-style environment (windows, dock, folders, widgets) where
applications, resources and system operations live side by side.

It **consumes** sister platforms and never acts as their source of truth:
- **Agent Control Plane** owns the agent registry, lifecycle and health.
- **AI Workers Platform** owns worker composition and worker learning.
- **Domain Intelligence Kernel** owns domain packs (ontology, rules, DSL, knowledge, evals).
- **Connectors / MCP** own enterprise integrations.

`context.md` holds the full vision: an 8-layer architecture, the lifecycle, approval
checkpoints, platform contracts, the blueprint shape and the roadmap.

### What this repo is today
A **frontend-only prototype** (React + Vite + TS). All "intelligence" and "runtime" is
**deterministic mock logic over fixtures in the browser**. There is no backend, no LLM, and no
real agent, worker, connector or MCP calls. State persists in `localStorage`. The architecture
is deliberately shaped so the mock services can later be swapped for real APIs.

---

## 2. Running it

```bash
npm install
```

```bash
npm run dev        # http://localhost:5173
```

```bash
npm run build      # tsc -b && vite build
```

```bash
npm run lint       # oxlint
```

E2E smoke scripts use Playwright. Playwright is **not** a project dependency: in cloud sessions
it's pre-installed globally, and locally you `npm i -D playwright` yourself.

```bash
npm run build && npx vite preview --port 4173 &
```

```bash
node e2e/operations.cjs   # also: desktop.cjs, studio-journey.cjs, studio-domains.cjs, intelligence.cjs, evolution.cjs
```

| Suite | Covers |
|---|---|
| `e2e/desktop.cjs` | M1: desktop, windows, dock, launcher, widgets, notifications |
| `e2e/studio-journey.cjs` | M2: Insurance journey Discover→Publish, reload, invalidation |
| `e2e/studio-domains.cjs` | Healthcare and Banking through validation |
| `e2e/intelligence.cjs` | M3: understanding, resources, versions, registry, reset |
| `e2e/evolution.cjs` | Architect "why required", diffs, status sort, overflow at 1440/1280/1024/390 px |
| `e2e/operations.cjs` | M4: end-to-end runtime, approvals, failures, learning, persistence; asserts no mock tags |

`e2e/fixtures/banking-generated-app.json` is a fixture for the generated-app tests.

Stack: React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui (source in
`src/components/ui`, also `@base-ui/react`/`radix-ui`), lucide-react icons, Framer Motion,
Recharts, React Flow (`@xyflow/react`), Plus Jakarta Sans. Alias `@/*` → `src/*`. Started from `claude-react-starter`.

---

## 3. What's in the app (user-facing tour)

### Desktop shell (`src/app/shell`, `src/app/windows`, `src/app/os`)
- **Top bar (72px)** with a **floating dock** in the centre (Framer Motion, magnifying tiles,
  names on hover, active item expands with its name). The dock items are: Home, Applications
  (launcher), Application Studio, Operations, Learning, System Explorer, then a divider, then
  every open app in opening order with run-state dots. On the right: notifications and settings.
  The global Ask AI / OS Assistant was removed at the product owner's request; the AI Architect
  inside Application Studio is the one AI surface. On the left: identity and the focused app. There is no bottom dock
  any more; it moved into the top bar.
- **Desktop canvas:** each domain (Insurance, Healthcare, Banking) is one glass folder previewing its
  apps; clicking expands it in place while the rest of the screen blurs. **Platform tools** (Workflow Studio, System
  Explorer, Operations, Learning) are a separate titled section. New apps start from the "+" menu. The
  wallpaper is a teal-to-warm-horizon image. It was restored after a brief "minimal wallpaper"
  experiment, at the product owner's request.
- **Widgets** (`src/app/widgets`) are configurable in Settings, and each deep-links somewhere:
  Approvals, Application activity, Worker activity, Platform activity, and others.
- **Window manager:** open, focus, minimize, maximize/restore, close, drag and resize, clamped to
  the desktop. Minimize is a genie into the app's dock tile (restore reverses it); hovering a running
  app's tile shows live window previews to pick from. Apps are single-instance today; previews list
  every window an app has. Windows scale and fade on open, shrink into their dock tab on minimize, and fade
  out on close. Focus changes are not animated. `prefers-reduced-motion` turns motion off.
- **Launcher** (Cmd/Ctrl+K) searches apps and ranks name matches first. It can also start
  "Create application" and open System Explorer.
- **Notification centre** (read, dismiss, clear, open target).

### Built-in applications (`BuiltinAppId` in `src/app/registry/types.ts`)
| App id | What it is |
|---|---|
| `application-studio` | The application factory (see below). Indigo-themed via `.theme-studio`. |
| `claims-intelligence` | Insurance claims app. It runs a real (mock) runtime blueprint, v0.4.0, compiled by the Studio generator ("AI-Driven Claims Automation"). |
| `document-ai` | Document extraction UI with field count, confidence status and per-field confidence bars. |
| `workflow-studio` | Workflow canvas with contextual step configuration. |
| `analytics-workspace` | Analytics dashboard (Recharts, mock data). |
| `system-explorer` | Registry of applications, domain packs, agents, workers, connectors, workflows and activity, plus application detail. |
| `operations` | Operational workspace: overview, applications, executions, approvals, activity, audit, resources. |
| `learning` | Observations, improvement proposals, blueprint change loop. |
| `settings` | Widgets, preferences, **Demo data → Reset**. |
| `folder-browser` | Opens a domain folder's contents. |

Generated apps have ids `app-${string}` (`GeneratedAppId`). They're registered at publish time
and rendered by `GeneratedAppHost`.

### Application Studio: 6 revisitable stages (`src/app/studio`)
`discover → define → architect → compose → generate → publish` (`STAGES` in
`studio/types.ts`). It's a persistent project workspace, not a locked wizard.

| Stage | What happens | Service |
|---|---|---|
| **Discover** | Composer with domain chips and example cards. The "Understanding" artifact has a summary, evidence quotes taken from the user's own words, six groups (objective, people, process, information, rules, capabilities), accept/reject suggestions and clarifying questions. Text that matches no scenario gets an honest fallback, never pretend understanding. | `services/mock/intent-service.ts` (keyword match against 3 scripted scenarios; `MIN_PROMPT_LENGTH = 24`) |
| **Define** | Structured, **versioned** RequirementSpec (users, capabilities, inputs, outputs, constraints, success criteria). Edit, add, remove, per-item clarification. | — |
| **Architect** | 2–3 alternative **operating models** per domain (Insurance: Assisted Claims Processing / AI-Driven Claims Automation / Intelligent Claims Operations), swimlane workflow, step inspector, compare-all table. Shows facts (e.g. "people on N of M steps"), never scores. | `architecture-service.ts` (`buildOptions`, `approachInsights`) |
| **Compose** | Capability → resource coverage map: Selected / Available / Requires configuration / Missing. Searchable catalogue, resource detail sheet. Approval-gated **simulated worker composition**: Healthcare fails on the first attempt by design, then succeeds on retry. | `capability-analysis-service.ts`, `data/resources.mock.ts` |
| **Generate** | Versioned **Application Blueprint** with ten business-readable sections, inline edits as patch versions, revision history, an optional JSON view, and a live preview rendered by `ExperienceRenderer`. | `blueprint/generate.ts` |
| **Publish** | Eight deterministic checks (`blueprint/validate.ts`) run automatically; only items needing a decision are shown and they gate publishing. Simulated deployment. Registers the app in the registry, desktop, folder, launcher and window manager. | `registerGeneratedApp` in `registry/applicationRegistry.ts` |

**Studio UX (Nov 2026 redesign).** A pale canvas in the OS colour theme with floating liquid-glass controls
(`design.md` §10), pictorial and low on text:
- **Journey navigator** (`JourneyRail`): floating glass card with the application's identity,
  a progress ring and every level with its status and outcome. Collapses to icons, then to a top
  bar on narrow windows.
- **Chain of thought**: `ThinkingChain` plays while the OS works and leaves a result per step;
  `ThoughtStrip` under each level title shows how it was reached. Both show facts only
  (`services/mock/thought-chain-service.ts`).
- **Compose** is a React Flow canvas (`components/compose/`): steps in order, each with the resource
  attached beneath, pan/zoom/drag, and a floating inspector (coverage overview or one need). After a
  decision, the guided path jumps to the next need that requires one. Steps come from the chosen
  approach; they are not added or removed on the canvas.
- **Architect** and Generate → Workflow draw swimlanes with `ApproachFlow`. Generate is a picture
  board of sections; Publish shows the app as it will appear on the desktop.

The **AI Architect** (a floating orb, opening a floating glass panel) gives scripted, context-aware replies built from project
state. Examples: why an approach is recommended, "Why is <capability> required?", how to reduce
human intervention, unavailable workers, approvals. Replies show "based on" sources and
navigation actions. Unscripted questions get an honest list of what it can answer.

**Version history:** each version keeps a snapshot. You can compare by section with field, step,
screen and folder-level Added / Removed / Changed highlighting. Rollback creates a **new draft
version** and needs confirmation.

**Lifecycle:** Draft → Designing → Reviewing → Ready → Published → Changes pending
(`studio/lifecycle.ts`). **Invalidation:** editing an earlier stage marks every later completed
stage **Needs review**, with the reason (`invalidateAfter` in `studioReducer`).

Three domains are scripted in `data/studio-scenarios.mock.ts`: **Insurance, Healthcare,
Banking**.

### Operational runtime: Milestone 4 (`src/app/runtime`)
```
Published app ─▶ Transaction ─▶ Execution (queued → running → paused → waiting-approval → completed | failed | cancelled)
  steps come from the app's blueprint workflow, each run by its pinned resource (simulated script)
  approval rules (workflow-config) pause the execution ─▶ Approvals queue ─▶ approve / reject / request info
  every transition writes an AuditEvent (the activity stream IS these records)
  completion writes an Outcome; failures, rejections, info requests and workarounds write LearningSignals
  ≥ 2 matching signals ─▶ ImprovementProposal ─▶ accept ─▶ NEW DRAFT blueprint version ─▶ validate ─▶ publish
```
- `types.ts`: one shared model (Transaction, Execution, ExecutionStep, Approval, AuditEvent,
  Outcome, LearningSignal, ImprovementProposal, RuntimeState).
- `engine.ts`: a pure, deterministic state machine. Its functions are `submitTransaction`,
  `tick`, `decideApproval`, `requestInformation`, `respondToInformationRequest`,
  `pauseExecution`, `resumeExecution`, `cancelExecution`, `retryStep` and `evaluateProposals`.
- `scripts.ts`: per-capability step processing. `workflow-config.ts`: approval rules, rejection
  handling, outcome labels and governance policies per domain.
- `store.ts`: the persisted store. It is **seeded by running the same engine** at fixed times
  (four Claims Intelligence executions), so seeds and live records can't contradict each other.
- `runtime-apps.ts`: which blueprint each app runs. `observability.ts`: derived **counts only**.
- Deterministic failure samples: unreadable document → retry; lapsed policy → no retry;
  connector timeout; missing statements; restricted KYC.
- Studio-published apps run their pinned published blueprint (window → *Transactions*). Accepted
  improvements become a draft in their Studio project.
- *Operations → Restart demo scenario* restores the seed. *Settings → Reset* clears everything.

---

## 4. Code map

```
src/
  App.tsx, main.tsx, index.css         (tokens, glass utilities, .theme-studio, wallpaper)
  app/
    os/          OsProvider, os-context, use-os: windows, overlays, notifications, prefs
    windows/     windowReducer (pure), WindowFrame (chrome/drag/resize), WindowManager
    shell/       DesktopShell, TopBar, Dock, DesktopCanvas, ApplicationLauncher, NotificationCenter
    widgets/     DesktopWidgets, WidgetCard, widgetCatalog
    registry/    applicationRegistry (metadata + generated apps, persisted, subscribable),
                 applicationComponents (id → lazy component), types, use-applications
    studio/      StudioProvider, studioReducer, lifecycle, migrate (older drafts), stageMeta,
                 stages/ (one file per stage), components/ (JourneyRail, StudioParts, ApproachFlow, compose/,
                 ArchitectPanel, BlueprintDiff, VersionHistory, FlowDiagram, LifecycleTrack, StudioHome, …), hooks/use-simulation
    blueprint/   types.ts (schema = source of truth), generate.ts (+ patches), validate.ts
    experience/  ExperienceRenderer (blueprint pages → trusted components), GeneratedAppHost, fields
    runtime/     types, engine, scripts, workflow-config, store, runtime-apps, observability, RuntimeClock,
                 components/ (TransactionForm, ExecutionTimeline/Detail/List, ApprovalQueue/Detail,
                 AuditList, EventStream, OutcomeView, GovernanceView, ResourcePanel, ApplicationOperations, AppRuntimePanel)
    operations/  OperationsApp
    learning/    LearningApp, learning-service
    services/    MockServicesProvider, app-records-store, demo-data (reset)
      mock/      intent, architecture (+ AI Architect), thought-chain, capability-analysis, resource-discovery,
                 blueprint (diff, readiness), application-registry, activity, attention, simulate
    resources/   ResourceDetailSheet
    applications/ claims-intelligence, document-ai, workflow-studio, analytics-workspace,
                 system-explorer, settings, folder-browser
  components/
    ui/          shadcn/ui primitives (do not restructure)
    os/          AppIcon, StatusBadge, InfoTip, SidebarNav (shared OS micro-patterns)
  data/          *.mock.ts fixtures, one concern per file: resources (ONLY resource catalogue),
                 studio-scenarios, applications, activity, platform, runtime, claims, documents,
                 notifications, analytics
```
About 19.7k lines of app code, not counting `components/ui`.

### Persistence (`localStorage`, prefix `enterprise-ai-os:`)
`studio:v1` (drafts + version snapshots), `generated-apps:v1`, `runtime:v1`,
`app-records:v1`, `claim-decisions:v1`, `recent-apps:v1`, `widgets:v1`.
In-flight simulations are never persisted, so a reload always lands on a stable state. If you
change a persisted shape, bump the key version or add a migration (see `studio/migrate.ts`).

---

## 5. Non-negotiable rules (summary of `CLAUDE.md`)

1. **Add an app** by registering it in `applicationRegistry.ts` **and** `applicationComponents.ts`.
   Never hardcode a window or modal per app.
2. Window state is a pure reducer. Shell components use it only through `useOs()`.
3. Mock data lives in `src/data/*.mock.ts`. **The UI shows no mock/prototype tags**, because the
   product owner removed them; an e2e test asserts this.
4. Simulated intelligence lives in typed services under `src/app/services/mock/`. Keep it
   **deterministic**. Never claim a model "understood" something, and never invent metrics,
   percentages or validation findings.
5. The OS **reads** platform resources; it doesn't own them. Registry, activity and approvals
   views are **derived**, never a second copy.
6. Show status with the shared `StatusBadge`.
7. **Every visible control must work.** Otherwise omit it or label it as a placeholder.
8. Generated apps are **data, not code**. The Blueprint is the source of truth, rendered by
   `ExperienceRenderer` with trusted components. Never generate or execute code.
9. Studio changes go through `studioReducer` actions. Changing an earlier stage **invalidates**
   later ones; it never silently rewrites them.
10. Operational records live only in the runtime store and change only through engine
    transitions. Audit and activity are written by those transitions. Use **counts only**: no
    invented rates or KPIs.
11. A published blueprint never changes silently. Improvements become draft version → validate →
    publish.
12. Studio uses `.theme-studio` (`design.md` §10): pictorial screens with at most 1–2 lines of text
    per block. Reasoning and explanations go behind `InfoTip` or expanders, not inline paragraphs.
13. Window content is a **container-query context**. Size app layouts with `@…:` variants, not
    viewport breakpoints.
14. UI work follows `.claude/skills/frontend-kit/SKILL.md`. Engineering conventions are in
    `references/engineering.md`; the visual system is in `references/design.md`.

### Design system ("Liquid Glass")
Extracted from reference images into `.claude/skills/frontend-kit/references/design.md` and
applied **only** through CSS variables in `src/index.css`.
- Chrome (top bar, dock, launcher, side panels) is translucent glass. Content panes are opaque
  white. **Glass never carries content-dense text.**
- `--primary` is `#1475BF` (passes AA). The brighter `#2891E6` is used for indicators and focus
  only.
- Window controls sit on the right in the order green / yellow / red (maximize, minimize, close).
- The theme is light-first. The dark theme is inferred and unverified.
- Utilities are `.glass`, `.glass-strong` and `.glass-dark`, with no-blur and
  reduced-transparency fallbacks.

---

## 6. History: what has been done (chronological)

| Commit | Milestone | Highlights |
|---|---|---|
| `e893242` | Baseline | Imported `claude-react-starter` |
| `a3d3131` | **M1 Desktop foundation** | Registry + lazy component map, pure window reducer, dock, launcher (Cmd/Ctrl+K), folders, 6 widgets, notifications, scripted assistant, Claims Intelligence + Document AI UIs, lighter Workflow Studio / Analytics / System Explorer / Settings |
| `8ea8023` | **M2 Application Studio** | 7 stages, persisted subscribable generated apps, studioReducer with invalidation, blueprint schema 0.1 + generator + validation, ExperienceRenderer / GeneratedAppHost, e2e suites; fixed container queries in windows |
| `1827296` | **M3 Intelligence experience** | Understanding artifact with evidence, clarifying questions, distinct operating models, swimlanes, context-aware AI Architect, coverage map, worker approve/reject, 10 readable blueprint sections, readiness, version snapshots + compare + rollback, lifecycle track, System Explorer registry, single resource catalogue, demo-data reset |
| `67cb917`, `3d3bf28` | Design | Extracted the Liquid Glass design system into `design.md` and applied it to tokens and the shell |
| `67d6239` | M3 evolution | Architect answers "Why is X required?", readable diffs with Added/Removed/Changed, registry sort by lifecycle, catalogue versions/owners, overflow fixes at 1024 px and on phones |
| `5f856f2` | **M4 Runtime & governance** | Runtime engine/store/scripts/config, Claims Intelligence on a compiled blueprint, transactions/executions/timeline, approvals queue, Operations workspace, Learning workspace with proposals → draft versions, `operations.cjs` |
| `4377df1` | Shell polish | Dock moved into the top bar, window open/minimize/restore/close motion, Workflow Studio canvas, Document AI confidence, less explanatory copy everywhere |
| `b9bfd53` | Polish 2 | **All mock/prototype tags removed**, 72 px top bar with floating magnifying dock, Ask AI pill, folder groups + app cards with `tagline`, **Studio redesign** (indigo `.theme-studio`, icon stepper, InfoTips, card-based projects home), redesigned Architect and Assistant panels |
| `3564586` | Revert | Restored the teal-to-warm-horizon wallpaper (product owner's request) |
| `640f092` | Studio UX | Floating journey navigator and AI Architect, visual chain of thought, Compose as a React Flow canvas, pictorial stages, global Ask AI removed |
| `1e13ea1` | Merge | Merged `claude/peaceful-hopper-xg4v6p`: new home page and "+" menu kept; its Build layers panel and Preview step not taken (product owner's decision) |
| `ceb09d2` | Home and Studio | Domain tiles and glass panel, Platform tools section, three glass widgets, Studio back on the OS colour theme, Validate step removed (checks run on Publish), new-application body centred |
| `2452ee8` | Home | Home label, frosted widgets, soft folder icons, folders expand in place |
| (latest) | Shell | Fixed-size dock (no shiver), lit running bar, window previews, genie minimize, soft dock icons, four wallpapers |

Product-owner decisions to respect: Studio stays on the OS colour theme with no dark fills; no Validate step; no mock tags in the UI; reasoning hidden behind info tips;
the teal-horizon wallpaper; the dock in the top bar; minimal explanatory copy; counts, never
invented rates.

---

## 7. Known limitations and open items

- Everything is simulated. No backend, auth, LLM, agent, worker, connector or MCP integration.
- The intent service is keyword-matched to 3 scenarios (Insurance, Healthcare, Banking). Other
  prompts get the honest fallback and can't be carried through the full journey.
- The dark theme is inferred and unverified.
- The build warns that one chunk is over 500 kB. There's a vendor split already; more code
  splitting is possible.
- Lint shows 3 warnings in shadcn files (`carousel.tsx`, `button.tsx`, `sidebar.tsx`). They were
  left as-is because shadcn sources are not to be modified unnecessarily.
- E2E needs Playwright to be available. It isn't in `package.json`.
- The roadmap in `context.md` §10 lists **Phase 2 Domain Intelligence Kernel** (domain packs as
  versioned JSON assets: ontology, process catalogue, rules, schemas, DSL, knowledge, evals) as
  not yet built as a first-class module. Today the scenario fixtures stand in for it.

## 8. Suggested next steps (for the next thread)

Pick based on the product owner's priorities:
1. **Domain Intelligence Kernel (Phase 2):** a versioned Insurance domain pack (JSON) that the
   intent, architecture and validation services read instead of hand-scripted scenarios.
2. **Backend seam:** put the `services/mock/*` and runtime engine behind interfaces/adapters so
   a real API (Agent Control Plane, AI Workers Platform, Runtime contracts in `context.md` §6)
   can replace them.
3. **A second end-to-end domain app** to prove the OS isn't insurance-specific (Banking is the
   closest; it already has a generated-app fixture).
4. Real LLM-backed intent and architect, kept behind the same typed service contracts, while
   preserving the honesty rules (no invented metrics; evidence for claims).
5. Dark-theme verification, bundle splitting, and adding Playwright as a devDependency with an
   `npm run e2e` script.

## 9. Working conventions for future threads

- Read `CLAUDE.md`, this file and `context.md` before changing anything. Read
  `.claude/skills/frontend-kit/SKILL.md` before any UI work.
- Develop on the branch you're given and commit with descriptive messages. Run `npm run build`,
  `npm run lint` and the relevant `e2e/*.cjs` suite before pushing.
- Update `README.md` and this `HANDOFF.md` when you finish a milestone.
