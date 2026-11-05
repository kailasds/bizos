# Enterprise AI OS --- Product & Architecture Context

**Document:** `context.md`\
**Version:** 1.0\
**Status:** Foundational product context\
**Purpose:** Preserve the agreed product vision, architecture,
responsibilities, lifecycle, desktop experience, technical principles,
and initial implementation direction. This document is the shared
context for future product, UX, architecture, and implementation work.

------------------------------------------------------------------------

## 1. Product vision

### 1.1 What we are building

We are building an **AI-Native Enterprise Operating System (Enterprise
AI OS)**: an enterprise application operating environment where a
business user describes a business problem in natural language and the
OS understands the problem, designs a solution, assembles the required
intelligence and resources, generates a usable application, deploys it,
and provides an environment to operate and improve it.

The user should not need to understand agents, workers, DSLs, compilers,
orchestration, APIs, or application architecture. The user should focus
on the business problem and the outcome they expect.

**Product promise:** Describe a business problem. Get a working
enterprise application.

This is not a conventional low-code/no-code builder. A conventional
builder asks users to configure screens, forms, workflows, and
integrations. The Enterprise AI OS should ask what the user wants to
achieve and take responsibility for determining how to achieve it.

It is not a traditional hardware/kernel operating system. It is an
enterprise application operating environment with an AI-powered
application factory at its core.

### 1.2 Core product capabilities

The OS must be able to:

1.  Understand business intent and domain context.
2.  Gather and structure requirements, outcomes, users, and constraints.
3.  Propose alternative solution architectures and workflows.
4.  Discover existing agents, workers, services, connectors, and
    capabilities.
5.  Identify capability gaps and assess feasibility.
6.  Reuse existing resources or request new AI workers from the AI
    Workers Platform.
7.  Compile an approved solution into a validated application
    specification.
8.  Generate the UX and UI using governed design systems and a trusted
    component catalogue.
9.  Deploy and run the application in a controlled runtime.
10. Monitor application outcomes, execution health, resource usage, and
    failures.
11. Support controlled improvement through evidence, evaluation, and
    approvals.

### 1.3 Foundational product principle

**Hide the underlying complexity; expose the business outcome.**

The desktop should feel like an operating environment where
applications, resources, intelligence, and system operations coexist. It
should not feel like a conventional enterprise dashboard with a sidebar
and a collection of unrelated modules.

------------------------------------------------------------------------

## 2. Existing ecosystem and product boundaries

The Enterprise AI OS builds on existing platforms. It should orchestrate
and consume them, not replace them.

### 2.1 Agent Control Plane

The Agent Control Plane owns the lifecycle and governance of agents.

Its responsibilities include:

-   Agent registry and discovery.
-   Agent versions and lifecycle.
-   Agent tools and capabilities.
-   Permissions and policies.
-   Agent health and monitoring.
-   Agent execution metadata and governance.

The OS consumes agent capabilities and metadata through defined APIs and
capability contracts. The Control Plane remains the source of truth for
agents.

### 2.2 AI Workers Platform

The AI Workers Platform owns worker composition and worker-level
capability management.

Its responsibilities include:

-   Worker composition.
-   Worker configuration.
-   Skills and capabilities.
-   Knowledge association.
-   Agent access and composition.
-   Worker evaluation, learning, and lifecycle.

When the OS identifies a capability gap, it can request a worker
composition from this platform. The OS should receive a worker
identifier, version, capability contract, validation/deployment status,
and execution endpoint.

The OS must not assume that a worker is ready merely because a creation
request succeeded. It must wait for validation and deployment status.

### 2.3 Enterprise integrations

External enterprise systems are exposed through governed APIs,
connectors, and MCP servers where appropriate.

Examples include:

-   Business systems.
-   Data sources.
-   Document repositories.
-   External APIs.
-   Enterprise services.

MCP is an integration option, not the universal communication mechanism.
Prefer stable, versioned APIs and typed contracts for core
platform-to-platform interactions.

### 2.4 Ownership boundaries

  Function                                    Primary owner
  ------------------------------------------- ---------------------------------------
  Create and operate business applications    Enterprise AI OS
  Understand domain knowledge                 Domain Intelligence Kernel
  Design solutions                            Enterprise AI OS / Solution Architect
  Compile workflows                           Enterprise AI OS / Workflow Compiler
  Manage agent lifecycle                      Agent Control Plane
  Compose and manage workers                  AI Workers Platform
  Execute application workflows               Application Runtime
  Generate application UX/UI                  Enterprise AI OS
  Monitor application business outcomes       Enterprise AI OS
  Monitor agent health and behavior           Agent Control Plane
  Improve worker knowledge and capabilities   AI Workers Platform

The OS may provide a unified view of resources, but it must not become a
second source of truth for agents or workers.

------------------------------------------------------------------------

## 3. Overall architecture: eight logical layers

These are eight architectural responsibilities. They do not have to be
eight independent microservices. Begin with clear module boundaries and
separate services only when scale, ownership, or deployment needs
justify it.

### Layer 1 --- Domain Intelligence Kernel

**Purpose:** Provide reusable, structured business-domain understanding
to the OS.

Use versioned **Domain Intelligence Packs**, rather than treating a
domain as merely a fine-tuned model.

A domain pack can contain:

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Ontology                            Business entities, concepts, and
                                      relationships

  Process library                     Standard business processes and
                                      process patterns

  Business rules                      Deterministic domain rules and
                                      constraints

  DSL definitions                     Domain-specific operations and
                                      workflow expressions

  Data contracts                      Input/output structures and schemas

  Knowledge base                      Guidelines, manuals, policies, and
                                      reference material

  Evaluation suite                    Domain-specific tests and expected
                                      outcomes

  Templates                           Reusable workflow and application
                                      patterns
  -----------------------------------------------------------------------

Illustrative insurance ontology:

`Policy → Coverage → Claim → Incident → Evidence → Assessment → Settlement`

The Insurance domain should understand terms such as FNOL, mandatory
claim information, coverage validation, and decisions requiring human
approval.

Potential future domains include Insurance, Healthcare, Banking,
Manufacturing, Legal, and Supply Chain. These are examples, not a fixed
initial scope.

**Important design decision:** Do not fine-tune a model every time a
domain or document is added. Keep knowledge, rules, ontologies,
retrieval assets, schemas, and evaluations as versioned assets. Use
models for interpretation and generation; use deterministic engines for
decisions that must be consistent.

### Layer 2 --- Intent & Requirement Intelligence

**Purpose:** Translate a user's natural-language request into an
explicit, reviewable requirement specification.

The user describes the desired outcome without needing to know the
platform's internal concepts.

The engine performs:

1.  Intent discovery --- What problem are we solving?
2.  Requirement discovery --- What inputs, outputs, users, processes,
    and systems are involved?
3.  Outcome definition --- What does success mean?
4.  Constraint discovery --- What security, compliance, performance, and
    operational restrictions apply?

The generated **Requirement Specification** should capture:

-   Business objective.
-   User personas and roles.
-   Inputs and outputs.
-   Business processes and expected outcomes.
-   Success criteria.
-   Quality expectations such as accuracy, speed, reliability, and
    consistency.
-   Human review and approval requirements.
-   Security, privacy, compliance, and operational constraints.
-   Open questions and assumptions.

Do not force users to provide numerical targets they do not know. The OS
may propose measurable targets, explain trade-offs, and ask the user to
confirm them.

The output must be a versioned Requirement Specification, not merely a
conversation transcript.

### Layer 3 --- Solution Architecture Intelligence

**Purpose:** Convert approved requirements into one or more feasible
solution designs.

A dedicated **Solution Architect** is responsible for:

-   Business process decomposition.
-   Workflow identification.
-   Agent and worker capability discovery.
-   Service and connector discovery.
-   Data-flow identification.
-   Human-in-the-loop identification.
-   Security and governance planning.
-   Capability gap analysis.
-   Alternative solution generation.

The OS should propose multiple approaches where meaningful. For example,
a claims application could have:

-   Automation-first: automate intake and validation, with human review
    at critical decisions.
-   Human-assisted: prioritize processor verification and incremental
    automation.
-   Risk-first: screen for risk early, then route claims conditionally.

These are alternative approaches with explicit trade-offs, not
superficial variations of the same flow.

#### Solution feasibility analysis

The OS must compare required workflow capabilities against available
resource contracts. This must not be a simple name-matching exercise.

For each candidate resource, evaluate:

-   Supported operation and capability.
-   Input/output schema compatibility.
-   Required permissions.
-   Domain suitability and certification.
-   Performance and reliability requirements.
-   Version compatibility.
-   Availability and operational status.
-   Human approval and governance requirements.

The result is a **Capability Coverage Matrix**, showing which
requirements are covered, partially covered, or missing.

An existing agent is not automatically suitable for every application.

### Layer 4 --- Capability & Resource Orchestration

**Purpose:** Discover, allocate, reuse, and request the resources needed
by a solution.

The OS connects to the Agent Control Plane, AI Workers Platform, and
enterprise integrations through stable contracts.

A unified **Resource Registry** inside the OS provides a discoverable
view without taking ownership away from the source platforms.

Resource types include:

-   Agents --- owned by Agent Control Plane.
-   Workers --- owned by AI Workers Platform.
-   Domain packs --- owned by Domain Intelligence Kernel.
-   Connectors --- owned by integration infrastructure.
-   Applications --- owned by Enterprise AI OS.

Each resource should have a stable ID, version, ownership/source,
capability contract, status, permissions, and relevant execution
metadata.

#### Worker creation flow

When a capability is missing:

1.  Identify the missing capability.
2.  Check whether an existing agent can be reused or safely extended.
3.  If no suitable resource exists, generate a worker composition
    specification.
4.  Invoke the AI Workers Platform.
5.  Compose the worker from approved agents, skills, and knowledge.
6.  Validate and test the worker.
7.  Wait for deployment/readiness confirmation.
8.  Receive the worker ID, version, capability contract, and execution
    endpoint.
9.  Update the proposed application resource plan.

The OS should request resource creation only after the user approves the
relevant solution and required governance checkpoints are satisfied.

### Layer 5 --- Workflow Compiler & Application Specification

**Purpose:** Bridge business intent and an executable application.

The compiler is not merely a code-generation component. It converts an
approved solution into a validated, versioned application specification.

It has three responsibilities.

#### A. Workflow Compiler

Converts the approved solution design into an executable workflow
representation.

It validates:

-   Every workflow step maps to an executable resource or deterministic
    operation.
-   Inputs and outputs are compatible.
-   Dependencies are available.
-   Error, retry, timeout, and compensation paths are defined where
    required.
-   Human approvals are represented and enforced.
-   Workflow transitions are valid.
-   Permissions and policies are attached to the correct operations.

#### B. Application Specification Generator

Generates the **Application Blueprint**, the versioned source of truth
for the application.

The blueprint contains:

  -----------------------------------------------------------------------
  Section                             What it defines
  ----------------------------------- -----------------------------------
  Application metadata                Name, description, domain, owner,
                                      version

  Requirements                        User-approved requirements

  Solution architecture               Selected approach and rationale

  Workflow                            Nodes, edges, conditions,
                                      transitions

  Resources                           Agents, workers, services,
                                      connectors

  Data model                          Entities, fields, relationships,
                                      schemas

  UI specification                    Pages, navigation, components,
                                      interactions

  Permissions                         Roles, access policies, approval
                                      rules

  Integrations                        APIs, connectors, MCP servers

  Evaluation                          Acceptance criteria and test cases

  Runtime configuration               Execution, deployment, and
                                      environment settings
  -----------------------------------------------------------------------

#### C. Runtime Compiler / Deployment Engine

Converts the approved blueprint into deployable artifacts, such as:

-   Workflow configuration.
-   Backend/API configuration.
-   UI component definitions.
-   Data contracts.
-   Permission configurations.
-   Runtime manifests.

Use constrained specifications, a validated workflow DSL, a trusted
component catalogue, and a controlled execution runtime. Do not generate
arbitrary code and execute it without validation.

The blueprint must make an application reproducible from its approved
specification and pinned resource versions.

### Layer 6 --- Experience & UI Generation Engine

**Purpose:** Generate an appropriate user experience and visual
interface from the application blueprint.

Separate two decisions:

1.  What should the application experience contain?
2.  How should that experience look and feel?

The UX is derived from the application purpose, personas, tasks,
workflow, information needs, and data model.

For a claims application, the generated experience might include:

-   Claims dashboard.
-   New claim submission.
-   Document review.
-   Claim details.
-   Investigation workspace.
-   Approval queue.

The visual layer uses a **Design Specification Registry**. Design
specifications should be structured and reusable, not unrelated prompt
files.

The experience engine evaluates:

-   Application purpose.
-   User personas.
-   Information density.
-   Task types.
-   Workflow complexity.
-   Accessibility requirements.
-   Design consistency.
-   Supported components and patterns.

It recommends a design system and allows users to preview or change it
before generation.

The design system controls visual language and reusable presentation
patterns; it must not dictate the application's business or workflow
architecture.

The existing A2UI component catalogue work can support this layer.
Generate validated UI specifications using trusted components instead of
inventing components on every generation.

### Layer 7 --- Application Runtime & Execution Engine

**Purpose:** Run generated applications and execute their approved
workflows.

Responsibilities:

-   Application deployment and hosting.
-   Workflow execution.
-   Agent and worker invocation.
-   State management.
-   Data persistence.
-   API communication.
-   Authentication and authorization.
-   Error handling, retries, and timeouts.
-   Logging and audit trails.
-   Application versioning.
-   Runtime configuration and secrets management.

Generated applications must not invoke agents directly in an
uncontrolled way. Execution should pass through the controlled runtime
and orchestration layer.

This creates a consistent execution model regardless of which agents,
workers, or connectors an application uses.

### Layer 8 --- Governance, Observability & Learning

**Purpose:** Understand whether applications are operating correctly and
whether they are achieving intended business outcomes.

Observe:

-   Application performance.
-   Workflow execution health.
-   Agent and worker performance.
-   Resource utilization.
-   Failures and exceptions.
-   Business outcomes.
-   Cost and latency.
-   Human intervention.
-   Version and change history.
-   Audit and policy events.

The OS monitors application-level outcomes. The Agent Control Plane
continues to own agent-level health and governance. The AI Workers
Platform continues to own worker-level learning and capability
improvement.

A feedback loop may identify a recurring failure, gather evidence,
suggest an improvement, evaluate the proposed change, and request
approval before publishing it.

No unapproved change should silently alter a production application's
behavior.

------------------------------------------------------------------------

## 4. End-to-end application generation lifecycle

The lifecycle is stateful and iterative, not a rigid one-way wizard.

### Main lifecycle

1.  **Domain Intelligence:** Select or infer relevant domain packs and
    load the required ontology, rules, knowledge, schemas, and
    evaluations.
2.  **Intent & Requirement Discovery:** Understand the problem, users,
    inputs, outputs, expected outcomes, and constraints.
3.  **Solution Architecture:** Generate alternative solution approaches
    and workflows.
4.  **Capability Discovery & Gap Analysis:** Query existing agents,
    workers, services, and connectors; evaluate compatibility and
    coverage.
5.  **Resource Composition:** Reuse existing resources or request
    missing workers through the AI Workers Platform.
6.  **Workflow Compilation & Blueprint Generation:** Validate the
    workflow and generate the Application Blueprint.
7.  **Experience Generation:** Derive UX, select a design system, and
    generate UI specifications.
8.  **Validation:** Test schemas, workflow transitions, resource
    contracts, permissions, UI/data alignment, and acceptance scenarios.
9.  **Approval & Deployment:** Obtain required approvals, deploy the
    application, and register it on the desktop.
10. **Operation & Improvement:** Monitor execution and outcomes; propose
    controlled improvements.

### Iterative behavior

The lifecycle must support feedback loops:

-   If a workflow step has no compatible resource, return to solution
    architecture or resource composition.
-   If an agent contract is incompatible, revise the resource plan or
    workflow.
-   If UI generation reveals missing data requirements, revise the
    Application Blueprint.
-   If validation fails, return the relevant artifact to the responsible
    stage.
-   If a user changes requirements, identify affected artifacts and
    regenerate only what is necessary.

All artifacts and transitions should be versioned and traceable.

### Approval checkpoints

At minimum, plan for approval of:

-   Requirement specification.
-   Selected solution approach.
-   New worker/resource creation where required.
-   Application Blueprint and permissions.
-   Publication/deployment.
-   Production changes and learning-driven updates.

Approval policies may vary by organization and application risk.

------------------------------------------------------------------------

## 5. Desktop / OS experience

The desktop is the primary environment where users access applications
and system capabilities. It should borrow the interaction model of an
operating system without simply copying macOS.

### A. Desktop / Home

The desktop has three primary content types.

#### Application folders

Applications are organized by domain or purpose. Illustrative
categories:

-   Insurance.
-   Healthcare.
-   Banking.
-   Other domains.

Standalone applications can also appear directly on the desktop.

Clicking an application launches it in an OS window. Clicking a folder
opens its contents in a file-explorer-like view.

#### System widgets

Widgets provide an at-a-glance view of the platform. Potential widgets:

  Widget                Information
  --------------------- --------------------------------------------
  Platform health       Overall system health
  Active applications   Applications currently running
  Active executions     Workflows currently executing
  Worker activity       AI workers currently working
  Pending approvals     Actions requiring human approval
  Recent activity       Applications created, updated, or deployed

Widgets should be configurable. Avoid turning the desktop into a wall of
KPIs. Clicking a widget opens the relevant detailed workspace.

#### OS assistant

An assistant should be accessible from the desktop and able to:

-   Create an application.
-   Find and open applications.
-   Explain system activity.
-   Show workflow status.
-   Explain failures.
-   Suggest improvements.
-   Navigate users to relevant workspaces.

### B. Application Creation Workspace

This is a dedicated workspace, not a small modal or a basic chat window.

Suggested composition:

-   Left: project and requirement context.
-   Center: solution canvas / workflow composition.
-   Right: AI architect assistant.
-   Top: current phase, status, and approvals.

The journey is progressive:

1.  Discover.
2.  Define.
3.  Design.
4.  Compose.
5.  Generate.
6.  Validate.
7.  Publish.

Do not make this a rigid seven-step wizard with locked navigation. Use a
persistent project workspace with revisitable artifacts. Users should be
able to revisit requirements while reviewing a workflow without losing
progress.

### C. Application Windows

Generated applications open as windows inside the OS shell.

Expected interactions:

-   Minimize.
-   Maximize.
-   Restore.
-   Close.
-   Multiple open applications.
-   Window switching.
-   Application-specific notifications.

The OS shell remains persistent while applications run. A generated
application must behave like a real application, not a page trapped
inside the builder.

### D. Taskbar / Dock

The persistent taskbar/dock should provide:

  Element               Function
  --------------------- ------------------------------------
  OS launcher           Open applications and system tools
  Active applications   Switch between open windows
  AI assistant          Open the OS assistant
  Workers               Open AI Workers Platform
  Control Plane         Open agent monitoring
  Notifications         Pending actions and system alerts
  Settings              OS configuration
  Profile               User and session management

A subtle execution indicator can show when an application is running an
AI workflow. Clicking it opens execution details without forcing the
user to leave the current application.

### E. System Explorer

The System Explorer is different from desktop application folders. It is
a system-level view of what the OS contains.

It provides access to:

-   Application registry.
-   Domain intelligence packs.
-   Agent resources.
-   Worker resources.
-   Connectors.
-   Application templates.
-   Workflow definitions.
-   System activity.

The desktop is where users work. The System Explorer is where they
understand and manage the OS ecosystem.

------------------------------------------------------------------------

## 6. Logical backend architecture

Begin with modular boundaries and well-defined contracts. Do not start
by creating a large number of microservices. Separate modules into
services only when scale, ownership, or deployment needs justify it.

### Logical flow

``` mermaid
flowchart TB
    UI["AI OS Desktop / Application Builder"]
    API["API Gateway / OS Backend"]
    ORCH["Solution Orchestrator"]

    INTENT["Intent & Requirement Engine"]
    DOMAIN["Domain Intelligence Service"]
    ARCH["Solution Architect"]
    DISC["Capability Discovery"]
    COMP["Workflow Compiler"]
    EXP["Experience Generator"]
    DEP["Deployment Manager"]

    ACP["Agent Control Plane"]
    AWP["AI Workers Platform"]
    CON["Connectors / MCP"]
    RT["Application Runtime"]

    REG["Application & Resource Registry"]
    DB["Metadata / Version Store"]
    OBS["Observability & Audit"]

    UI --> API
    API --> ORCH
    ORCH --> INTENT
    INTENT --> DOMAIN
    DOMAIN --> ARCH
    ARCH --> DISC
    DISC <--> ACP
    DISC <--> AWP
    DISC <--> CON
    DISC --> COMP
    COMP --> EXP
    EXP --> DEP
    DEP --> RT
    ORCH <--> REG
    REG --> DB
    RT --> OBS
    ACP --> OBS
    AWP --> OBS
    ORCH --> OBS
```

### Suggested logical modules

  Module                  Responsibility
  ----------------------- --------------------------------------------
  `os-shell`              Desktop, windows, dock, widgets
  `application-studio`    Application creation workspace
  `intent-engine`         Requirement extraction and clarification
  `domain-kernel`         Domain packs, DSL, rules, and knowledge
  `solution-architect`    Solution design and alternatives
  `capability-registry`   Unified resource discovery
  `resource-composer`     Worker creation and resource allocation
  `workflow-compiler`     Workflow validation and compilation
  `experience-engine`     UX and design-system selection
  `ui-generator`          A2UI specification and UI generation
  `application-runtime`   Workflow and application execution
  `governance-engine`     Permissions, approvals, and policies
  `observability`         Execution monitoring and business outcomes

### Key platform contracts

The OS should integrate through explicit contracts rather than relying
on hidden implementation details.

**Agent Control Plane contract should expose:**

-   Agent identity and version.
-   Capability description and supported operations.
-   Input/output schema.
-   Required permissions.
-   Domain suitability/certification.
-   Lifecycle and availability status.
-   Invocation contract or execution endpoint.
-   Health and relevant operational metadata.

**AI Workers Platform contract should expose:**

-   Worker composition request.
-   Composition status and validation results.
-   Worker identity and version.
-   Capability contract.
-   Required agent/skill/knowledge dependencies.
-   Deployment/readiness status.
-   Invocation contract or execution endpoint.

**Application Runtime contract should expose:**

-   Application deployment and version.
-   Workflow start, status, and cancellation.
-   Execution state and outputs.
-   Human approval requests.
-   Errors, retries, and audit events.

Use API-first integration. Use MCP where it is a suitable tool/context
interface, not as a replacement for every internal API.

------------------------------------------------------------------------

## 7. Application Blueprint --- central data artifact

Every generated application is represented by a versioned **Application
Blueprint**.

Illustrative initial shape:

``` json
{
  "applicationId": "APP-001",
  "name": "Claims Intelligence Workspace",
  "domain": "insurance",
  "status": "draft",
  "version": "1.0.0",
  "requirements": {},
  "solutionArchitecture": {},
  "workflow": {
    "nodes": [],
    "edges": []
  },
  "resources": {
    "agents": [],
    "workers": [],
    "connectors": []
  },
  "dataModel": {},
  "experience": {
    "designSystem": "enterprise-light",
    "pages": [],
    "components": []
  },
  "security": {},
  "evaluations": [],
  "deployment": {}
}
```

This is illustrative, not a finalized schema.

The Application Blueprint is the contract between
requirement/architecture generation, workflow compilation, experience
generation, validation, deployment, and runtime.

### Versioning principles

-   Version the Application Blueprint.
-   Pin agent and worker versions used by a published application.
-   Version domain packs and DSLs.
-   Version workflow definitions and UI specifications.
-   Make upgrades explicit and testable.
-   Never allow a resource update to silently change a published
    application's behavior.
-   Preserve traceability from an application behavior to its blueprint,
    workflow, resource versions, domain pack versions, and approvals.

------------------------------------------------------------------------

## 8. Evaluation, safety, and governance principles

The OS should not select a solution only because an LLM claims it is
best.

Evaluate each approach against:

-   Requirement coverage.
-   Available capability coverage.
-   Missing resources.
-   Execution complexity.
-   Expected latency.
-   Estimated operational cost.
-   Security and compliance.
-   Human intervention.
-   Reliability and resilience.

The system should explain trade-offs and evidence behind
recommendations.

Generated applications must pass validation before publication.
Validation should include:

-   UI and data-schema alignment.
-   Workflow transition validity.
-   Agent/worker contract compatibility.
-   Permissions and role checks.
-   Human approval enforcement.
-   Error and retry paths.
-   Acceptance scenarios.
-   Domain-specific evaluations.

Use deterministic services for schema validation, workflow execution,
permissions, calculations, and rules. Use LLMs for interpretation,
planning, and generation.

Human approval is required for governed actions such as resource
creation, publication, critical decisions, and production changes,
according to configured policy.

------------------------------------------------------------------------

## 9. Recommended first demonstration application

### Claims Intelligence & Processing Application

Use a realistic insurance workflow to prove the architecture end to end.

Illustrative flow:

1.  User asks for an application to manage claims processing.
2.  OS loads the Insurance Domain Intelligence Pack.
3.  Requirement engine identifies claim intake, validation, fraud
    assessment, and review requirements.
4.  Solution Architect proposes alternative architectures.
5.  Capability discovery finds existing claim-related agents and
    workers.
6.  Gap analysis identifies missing investigation capabilities.
7.  With approval, OS requests a new worker from the AI Workers
    Platform.
8.  Workflow compiler generates and validates the workflow.
9.  Experience engine generates a claims dashboard and processing
    workspace.
10. Application is validated and published to the desktop.
11. Mock claims execute through the workflow.
12. OS shows application, workflow, agent, and worker activity.

This use case exercises domain knowledge, requirement discovery,
solution architecture, capability discovery, worker composition,
workflow compilation, UI generation, runtime, and observability.

A second application from another domain can later demonstrate that the
OS is reusable and not insurance-specific.

------------------------------------------------------------------------

## 10. Implementation roadmap

### Phase 1 --- OS Foundation

**Goal:** Build the desktop environment and application registry.

Scope:

-   Desktop home screen.
-   Application folders.
-   Standalone application icons.
-   System widgets.
-   Taskbar / dock.
-   Window manager.
-   Application launcher.
-   AI assistant entry point (initially a UI shell or mock interaction).
-   Application registry with mock applications.

At this stage, clicking an application should open a working mock
application window. Window interactions should work even though the
generated applications and backend are mocked.

**Deliverable:** A convincing OS desktop experience with working window
interactions and a clear foundation for later integration.

Do not start with AI application generation in this phase.

### Phase 2 --- Domain Intelligence Kernel

Start with one domain pack, Insurance.

Build:

-   Domain ontology.
-   Business process catalogue.
-   Business rules.
-   Data schemas.
-   DSL definitions.
-   Knowledge documents.
-   Evaluation examples.
-   Domain pack versioning.

Initial assets may be JSON files and local knowledge assets.

**Deliverable:** The platform can understand an insurance use case and
map business terminology to structured entities, processes, and rules.

### Phase 3 --- Application Creation Engine

Build the full creation flow:

1.  User enters a business requirement.
2.  Intent engine asks relevant clarification questions.
3.  Requirement Specification is generated.
4.  Solution Architect generates alternative approaches.
5.  Capability discovery checks existing agents and workers.
6.  Gap analysis identifies missing resources.
7.  User approves a solution.
8.  OS requests missing workers through AI Workers Platform integration.
9.  Workflow compiler validates the Application Blueprint.
10. UX and UI are generated.
11. Application is tested and previewed.

**Deliverable:** A complete generated application, not merely a workflow
diagram or static UI.

### Phase 4 --- Application Runtime

Implement:

-   Application deployment.
-   Workflow execution.
-   Agent invocation.
-   Worker invocation.
-   Application state management.
-   Initial local/mock persistence.
-   Execution logs.
-   Error handling.
-   Version management.

**Deliverable:** The generated application actually executes its
designed business process.

### Phase 5 --- Governance and Intelligence

Integrate:

-   Agent Control Plane.
-   AI Workers Platform.
-   Resource health.
-   Application performance.
-   Workflow observability.
-   Approval management.
-   Cost and latency monitoring.
-   Feedback and learning.

**Deliverable:** A complete environment to create, run, govern, and
improve business applications.

------------------------------------------------------------------------

## 11. Phase 1 --- detailed product and UX scope

Phase 1 is the current starting point. It is a desktop-shell prototype
with mock data, not the full AI application-generation engine.

### 11.1 Primary design objective

Create a clean, premium, minimal desktop environment that feels like an
enterprise operating system.

It should be:

-   Light-theme first.
-   Product-like and readable.
-   Minimal rather than visually overloaded.
-   Familiar enough to understand without training.
-   Flexible enough to host multiple application windows.
-   Consistent in spacing, typography, colors, iconography, and
    interaction states.

Do not make it look like a conventional admin dashboard. Do not overuse
gradients, glass effects, oversized graphics, or decorative AI visuals.

### 11.2 Desktop information architecture

**Desktop canvas**

-   Application folders grouped by domain/category.
-   Standalone application shortcuts.
-   Configurable system widgets.
-   Desktop-level AI assistant entry point.
-   Clear visual hierarchy and usable spacing.

**Dock / taskbar**

-   OS launcher.
-   Active application indicators.
-   AI assistant.
-   AI Workers Platform shortcut.
-   Agent Control Plane shortcut.
-   Notifications.
-   Settings.
-   User profile.

**Application launcher**

-   Search applications and system workspaces.
-   Browse applications by category.
-   Launch applications.
-   Open System Explorer.
-   Start application creation.

**System Explorer**

Initial sections:

-   Applications.
-   Domain packs (can be placeholder in Phase 1).
-   Agents (link/placeholder for Control Plane).
-   Workers (link/placeholder for Workers Platform).
-   Connectors (placeholder).
-   Workflows (placeholder).
-   Activity.

**Application window manager**

-   Open an application in a window.
-   Minimize to dock/taskbar.
-   Restore from dock/taskbar.
-   Maximize and restore.
-   Close.
-   Switch between multiple open windows.
-   Maintain application identity and window state while switching.
-   Support sensible responsive behavior and viewport constraints.

**System widgets**

Use a small, configurable set of mock widgets:

-   Platform health.
-   Active applications.
-   Active executions.
-   Worker activity.
-   Pending approvals.
-   Recent activity.

Each widget should have a meaningful click-through destination, even if
the destination is a placeholder/detail view in Phase 1.

### 11.3 Phase 1 mock applications

Use representative mock applications to demonstrate the desktop model.
Suggested examples:

-   Claims Intelligence.
-   Document AI.
-   Workflow Studio.
-   Analytics Workspace.

These are sample applications for the prototype, not finalized product
commitments.

At least two should open into distinct, believable mock application
interfaces so the window manager can be demonstrated with multiple
applications.

### 11.4 Phase 1 interaction requirements

-   Application icon click opens the corresponding window.
-   Folder click opens a folder view.
-   Window controls work.
-   Dock/taskbar reflects open applications.
-   Clicking an active dock item switches to its window.
-   Minimized windows can be restored.
-   Multiple windows can coexist.
-   Launcher can search/filter mock applications.
-   Widget click opens the relevant detail view.
-   OS assistant opens a panel or workspace shell.
-   Settings opens a settings workspace shell.
-   Notifications can be opened and dismissed.
-   Empty, loading, hover, selected, active, minimized, and disabled
    states are designed consistently.

No visible control should be inert. If a feature is not implemented in
Phase 1, make it a clearly marked placeholder or omit the control.

### 11.5 Phase 1 non-goals

Do not build these yet:

-   Real LLM-based requirement discovery.
-   Real domain training or model fine-tuning.
-   Real agent discovery or invocation.
-   Real AI worker creation.
-   Real MCP integration.
-   Workflow compiler.
-   Application code generation.
-   Production application runtime.
-   Production monitoring integrations.
-   Real authentication/authorization infrastructure.

Use mock data and local state to prove the desktop interaction model.
Keep the architecture ready for later API integration.

### 11.6 Phase 1 acceptance criteria

Phase 1 is complete when:

1.  The desktop loads as the primary OS home screen.
2.  Application folders and standalone application icons are visible and
    understandable.
3.  At least two distinct applications can be opened.
4.  Multiple application windows can remain open simultaneously.
5.  Minimize, maximize, restore, close, and window switching work.
6.  Dock/taskbar state accurately reflects open and minimized
    applications.
7.  Application launcher can find and launch applications.
8.  System widgets display consistent mock data and open relevant
    details.
9.  OS assistant and settings have working entry points.
10. Layout works at the target desktop viewport and adapts sensibly to
    smaller screens.
11. Design tokens and reusable shell components are established.
12. No dead controls, broken interactions, or misleading live-data
    claims remain.

------------------------------------------------------------------------

## 12. Technical implementation principles

The current project may begin as a frontend prototype with mock data.
Preserve these principles:

-   Keep the OS shell separate from generated application content.
-   Keep window management independent from each application's internal
    UI.
-   Use a centralized application registry, even when it is mock-backed.
-   Use stable application IDs rather than display names as identity.
-   Keep mock data in dedicated fixtures rather than scattering it
    through components.
-   Separate UI state from application metadata.
-   Use reusable, typed components and design tokens.
-   Keep navigation and window state predictable.
-   Avoid overengineering the backend before the end-to-end product flow
    is validated.
-   Do not show numerical performance claims unless backed by real or
    explicitly labelled mock data.
-   Clearly distinguish mock status and mock metrics from live system
    information.

### Suggested initial frontend structure

``` text
src/
  app/
    shell/
      DesktopShell
      DesktopCanvas
      Dock
      WindowManager
      ApplicationLauncher
      SystemExplorer
      AssistantPanel
      NotificationCenter
    registry/
      applicationRegistry
      applicationTypes
    windows/
      WindowFrame
      WindowControls
      WindowContext
    widgets/
      PlatformHealthWidget
      ActiveApplicationsWidget
      ExecutionActivityWidget
      WorkerActivityWidget
      ApprovalWidget
      RecentActivityWidget
    applications/
      claims-intelligence/
      document-ai/
      workflow-studio/
      analytics-workspace/
    settings/
  components/
    ui/
  data/
    applications.mock
    widgets.mock
    activity.mock
  hooks/
  lib/
  styles/
    tokens.css
    globals.css
```

This is a suggested starting structure, not a requirement to use these
exact filenames.

------------------------------------------------------------------------

## 13. Product principles to preserve in all future work

1.  **Business-first:** Users describe outcomes, not technical
    implementation.
2.  **Progressive disclosure:** Show the right information at the right
    stage; do not expose every internal capability at once.
3.  **Explainability:** Recommendations and feasibility decisions should
    have reasons and evidence.
4.  **Reuse before creation:** Discover and reuse suitable existing
    resources before composing new ones.
5.  **Contracts over assumptions:** Every resource and workflow step has
    explicit input/output and capability contracts.
6.  **Blueprint as source of truth:** The Application Blueprint connects
    requirements, workflow, resources, UX, validation, and runtime.
7.  **Governed execution:** Use approvals and policies for consequential
    actions.
8.  **Deterministic where necessary:** Use deterministic engines for
    rules, validation, permissions, and execution.
9.  **Version everything that affects behavior:** Domain packs, agents,
    workers, workflows, applications, and design specifications.
10. **Iterative lifecycle:** Stages can revisit earlier artifacts
    without losing traceability.
11. **OS experience, not admin dashboard:** The desktop is a coherent
    operating environment.
12. **Prove the vertical slice:** Validate the end-to-end application
    lifecycle with mock resources before building every subsystem.

------------------------------------------------------------------------

## 14. Immediate next step

Begin **Phase 1 --- OS Foundation**.

The first implementation exercise should be to establish the desktop
shell and its interaction model:

1.  Define the shell layout and desktop grid.
2.  Define the design tokens and visual language.
3.  Define the application registry and mock application metadata.
4.  Build the window manager and dock/taskbar.
5.  Add folders, application shortcuts, launcher, widgets, and system
    entry points.
6.  Add two or more mock application windows.
7.  Verify the complete interaction flow.

Do not implement the application-generation pipeline during this phase.
The Phase 1 objective is a convincing, usable OS environment that can
later host the intelligence and application-generation capabilities
described in this document.

------------------------------------------------------------------------

**End of context document.**
