---
name: frontend-kit
description: "Build front-end UI for this project with a fixed engineering foundation (React + TypeScript + Tailwind + shadcn/ui) and a per-project design system extracted from a reference image. Use this for any UI work — building screens, components, layouts, or restyling. The engineering conventions in references/engineering.md are identical across projects; the visual design in references/design.md is specific to this project and is generated from a reference image via the /extract-design command. Read this skill before building or editing any component."
---

# Frontend kit

A reusable foundation for building React UIs. The engineering half is fixed across every project; the design half is swapped per project by extracting it from a reference image.

Two halves, both required reading before building:

- `references/engineering.md` — **fixed.** How UI is built: React + shadcn/ui, file layout, the token bridge, component and state conventions. Identical in every project.
- `references/design.md` — **per-project.** What the UI looks like: colors, type, radius, spacing, icon choices, recurring micro-patterns (status/delta/pagination treatments), signature components, and the shadcn theme variables — extracted from this project's reference image. If it says NOT YET EXTRACTED, stop and run `/extract-design` first.
- `references/anti-slop.md` — **fixed.** The rules that keep output from looking generically AI-made: banned defaults, the required floor (states, a11y), and the build→critique→fix→re-check loop with an explicit acceptance bar. Applies to every screen. Read it before finishing any UI, and run its acceptance bar before calling anything done.
- `references/polish.md` — **fixed.** Small, concrete refinement details (concentric radius, icon optical alignment, tabular numerals, image outlines, noise texture, root background, hover restraint) applied *after* a screen already clears `engineering.md` and `anti-slop.md`. Two of these extend rules already in `engineering.md` — worth reading in full at least once, then as a reference.

Two more files are read situationally rather than up front every time: `references/extracting.md` (the methodology `/extract-design` uses — read only when extracting) and `polish.md` (read when refining a screen that already passes the basics, not needed for a first structural pass).

## How the pieces fit

```
reference image ──/extract-design──▶ design.md ──┐
                  (uses extracting.md)            ├──▶ the built UI
engineering.md (fixed) ───────────────────────────┘
```

`design.md` owns the *values* of the shadcn CSS variables. `engineering.md` owns the *rule* that everything routes through those variables. Because of that split, restyling the whole app for a new project means regenerating `design.md` and updating only `index.css` + `tailwind.config.ts` — components never change.

## Workflow

### Starting a project

1. Check whether this project already has a compatible engineering foundation — see `engineering.md`'s "Detecting an existing engineering foundation" section for the exact signals. State plainly which case applies. The human sets up any starter beforehand; this skill never clones one itself.
2. If `design.md` says NOT YET EXTRACTED: paste the reference image, run `/extract-design`, confirm the result looks right.
3. Read `engineering.md` and the freshly written `design.md` together.
4. Foundation detected → verify the token-bridge pieces rather than scaffolding, then wire `design.md`'s theme-variable block into the existing `index.css`/`tailwind.config.ts`. No foundation detected → scaffold fresh per `engineering.md`'s `## Stack` section, then do the same wiring. Either way, this wiring step is the "restyle surface" — get it right once and every component inherits it.
5. Build screens one at a time, composing from `ui/` primitives, each with its loading/empty/error states.
6. Once a screen structurally passes `anti-slop.md`'s acceptance bar, pass it through `polish.md` for the small details worth a deliberate check — refinement, not a first-pass gate.

### Restyling for a new reference

Run `/extract-design` with the new image. It overwrites `design.md`. Then update only `index.css` and `tailwind.config.ts` to match the new variable block. If components were built correctly (no raw hex, everything through tokens), they restyle with zero component edits — if any component *doesn't* pick up the new look, that's a token-bridge violation to fix, not a reason to hand-edit the component.

## The five things to get right

1. **Everything routes through shadcn CSS variables — including buttons, inputs, and chips, not just cards.** shadcn's own primitives ship with their own radius classes that need explicit wiring to `--radius`; check this by eye (button/card/input side by side) rather than assuming the CLI scaffold or a pre-existing foundation handled it. No raw hex, radius, or font in any component file. This is what makes the design swappable.
2. **`design.md` is the only styling source.** If a styling decision isn't in it, it's underspecified — extend `design.md`, don't improvise in a component. This includes spacing: every gap and margin traces to a named tier in `design.md` §6, never a one-off value chosen because it looked fine on one screen.
3. **`engineering.md` is the only structure source, and its default is edge-to-edge content.** Stack, layout, which primitive, state handling — from there, never from the design reference. Don't add an outer page frame or padding unless `design.md` explicitly defines one.
4. **Every data surface has three states.** Loading, empty, error — structural, required regardless of what the design shows (references almost never show them).
5. **Preserve shadcn's accessibility.** Focus rings, ARIA, keyboard behavior come for free — don't strip them for visual polish.
6. **Clear the anti-slop bar before finishing.** No banned defaults (default UI font, decorative/purple-blue gradient, identical-card rows, uniform-everything, vague copy, everything-at-once, decorative motion, untuned shadcn, non-lucide icons, silently downgraded micro-patterns). Run the acceptance bar in `anti-slop.md` and iterate until it passes — don't present work as done on the first pass.
7. **Icons are always `lucide-react`; status/delta/pagination patterns are always the one shared component `design.md` §8 specifies.** Both are easy to quietly simplify under time pressure (a look-alike SVG instead of the right import, a bare dot instead of the specified filled pill) and both look fine in isolation — the drift only shows up compared against the reference, so check deliberately rather than trusting a glance.

## Self-check

- Did I check for an existing engineering foundation before scaffolding anything, and state which case applied?
- Could I reskin this whole screen by editing only `index.css` and the Tailwind config? If not, a raw value leaked into a component.
- Is anything visual in a component that should be a token in `design.md`?
- Is anything structural (a layout or component-choice rule) sitting in `design.md` where it doesn't belong?
- Does every list/table/panel have a designed empty and error state, not just the happy path?
- Did I preserve focus-visible and keyboard behavior on every interactive element?
- Do buttons, inputs, and chips share the same radius family as cards — checked by eye, not assumed? Does every spacing gap trace to a named tier in `design.md` §6, not an improvised value?
- Is there an outer page frame or padding I added without `design.md` explicitly calling for one?
- Is every icon a named `lucide-react` import at one consistent stroke width — no look-alike SVGs, no emoji?
- Do status indicators, deltas, and pagination match `design.md` §8's specified treatment exactly, via a shared component — or did any get quietly built plainer than specified?
- Did I walk the full acceptance bar in `anti-slop.md`, and does the final gut-check pass — does this look like it came from *this* product, not any SaaS?
- Once the basics pass: do nested rounded shapes follow the concentric-radius formula, do hover states fire instantly, and do pale images/avatars have their outline — the `polish.md` checks worth a deliberate pass.

## Notes

- Match an existing project's framework (Vite vs Next) rather than migrating it.
- Never introduce a font or color not present in `design.md` — if the design needs one, it belongs in `design.md` via re-extraction or a deliberate edit, not slipped into a component.
- The engineering and extraction files are meant to be stable. Edit `design.md` freely (it's per-project and regenerable); edit the fixed files only when you're deliberately changing your standard across all future projects.
