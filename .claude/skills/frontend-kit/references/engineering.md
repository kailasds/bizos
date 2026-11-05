# Engineering conventions (fixed)

This file is identical across every project. It defines *how* UI is built — stack, structure, component rules. It says nothing about how the UI *looks*; that comes entirely from `design.md`. Keep this separation strict: never hardcode a color, radius, or font here, and never put a structural/component rule in `design.md`.

## Layout defaults — no improvised framing

A recurring failure mode without this section: an agent building a screen invents its own outer padding, wrapper, or "frame" around the page because nothing tells it not to. Fix that here, explicitly:

- **Content is edge-to-edge by default.** No outer page padding, no wrapping frame, no margin around the main body, unless `design.md` §7 (Signature components) or §6 (Radius & spacing) explicitly defines a shell/frame treatment (some references genuinely have one — a colored border-frame around the whole app, for instance — but that's a *design decision to extract*, never a default to assume).
- **All spacing comes from the scale `design.md` §6 defines** — page gutters, section gaps, card padding, inline gaps. If `design.md` doesn't yet define a spacing scale (older extraction, or a gap), stop and treat that as missing information to flag, not something to improvise per-component. Two different screens inventing their own margin-bottom is exactly how "some sections have spacing, some don't" happens.
- Apply the scale via a small fixed set of Tailwind classes or spacing tokens (e.g. `--space-1` through `--space-6` mapped to Tailwind's spacing scale) — not arbitrary one-off values (`mb-[17px]`, `pt-9` chosen because it looked fine on one screen). If a genuinely new spacing need comes up, add it to the scale in `design.md`, don't invent an outlier locally.
- **Set the background on `<html>`, not just a wrapper div**, using the same `--background` token as the rest of the app — see `polish.md` §6. This matters specifically for `design.md` outputs with a dark or non-white background: without it, overscroll bounce (notably Safari) can flash the browser's default white canvas behind an otherwise-dark page.

## Stack

- **React + TypeScript**, built with **Vite** (or Next.js app-router if the project is already Next — match what exists; don't migrate).
- **Tailwind CSS** for styling.
- **shadcn/ui** for component primitives, living in `components/ui/` — already installed if a foundation was detected (see below), otherwise installed via the CLI as part of scaffolding.
- Fonts loaded per `design.md` (self-hosted via `@fontsource/*` or a `<link>` — match the project; don't introduce a font not named in `design.md`).

### Icons — lucide-react, every time, no exceptions

**Every icon in the app is a named import from `lucide-react`.** Not an inline SVG one-off, not an emoji standing in for an icon, not a different icon package brought in for "just this one component" — even if the reference image uses a visually different icon style. This is a fixed standard across every project using this kit, same as the framework choice.

- `design.md` §8 (Recurring micro-patterns) names the specific lucide-react icon for each icon type the reference shows (e.g. `DollarSign`, `Clock`, `TrendingUp`). Use exactly those imports — don't substitute a similar-looking icon you picked yourself.
- If a needed icon isn't named in `design.md` (a new screen introduces a concept the reference never showed), pick the closest lucide-react icon and use it — never fall back to an inline SVG because nothing matched perfectly.
- **Stroke width must be consistent app-wide.** lucide-react defaults to `strokeWidth={2}` — use that uniformly unless `design.md` specifies otherwise. Mixing stroke weights (some icons at the default, some hand-tuned) is as visible an inconsistency as mismatched border radius, and just as easy to introduce by accident one component at a time.
- For an icon sitting alone in a prominent, deliberately-centered spot (an icon-only button, a large empty-state icon), bounding-box centering can still look off — see `polish.md` §2 for the optical-alignment fix (the blur test, per-icon nudges, asymmetric button padding). Not worth doing for icons inline with text.

## Detecting an existing engineering foundation

Before scaffolding anything, check whether this project already has a compatible engineering foundation — a pre-built React + Vite/Next + Tailwind + shadcn setup, however it got there. This kit doesn't know or care where it came from (an external starter, a previous session, anything else); it only checks the structural signals below. If they're present, **do not scaffold, reinstall, or restructure** — verify instead.

**Detection:**
- `components.json` exists at the project root, **and**
- `src/components/ui/` exists and is populated (more than a couple of files).

These two are the signals that actually matter — a real shadcn setup has both. Use `package.json` as confirmation, not a rigid checklist: it should show a React dependency, a recognizable build tool (Vite, Next, or equivalent), Tailwind, and something consistent with shadcn's styling approach (e.g. `class-variance-authority`, `tailwind-merge`, `clsx`, or equivalent utilities) and `lucide-react`. Treat this as ruling out a false positive (something that merely happens to have those two files without being a real setup), not as a list every entry must match exactly — a different package manager, Next instead of Vite, or a slightly different combination of the usual companion utilities is still a compatible foundation.

Both structural signals present, and `package.json` confirms a compatible setup → treat the project as already scaffolded, state this plainly, and move to verification below. Either structural signal missing → fall back to the `## Stack` scaffolding instructions below, unchanged.

**Verification, once detected — confirm rather than assume:**
- `index.css` declares the shadcn variable names `design.md` needs to write into, at neutral values rather than a previous project's actual palette.
- `tailwind.config.ts`'s `borderRadius` block actually maps to `--radius` — the known gap where a scaffold can look right and still not bind buttons/inputs (see the Radius section below).
- The `<html>` background rule (`polish.md` §6) is in place if the project is dark-themed.
- No assumption about *which* shadcn components are present — work with whatever's in `components/ui/`. A full catalog is a legitimate, expected state, not something to prune or second-guess.

**The test**: wire an extracted `design.md` into `index.css`/`tailwind.config.ts` only. If the app restyles cleanly with zero component edits, the foundation is sound. If something needs hand-editing, that's a token-bridge gap in the *existing* foundation to fix in place — not a reason to rescaffold.

This kit doesn't manage or refresh whatever produced the foundation — that's outside its scope. It only detects, verifies, and builds on top of what's there.

## Project layout

```
src/
├── components/
│   ├── ui/            # shadcn primitives — CLI-generated, do not hand-edit except to wire tokens
│   └── <feature>/     # composed app components built FROM ui/ primitives
├── lib/
│   └── utils.ts       # cn() helper etc. (shadcn default)
├── app/ or pages/     # routes/screens
├── index.css          # Tailwind directives + the CSS variables design.md defines
└── main.tsx
components.json         # shadcn config
tailwind.config.ts
```

## The token bridge — the one rule that makes this whole system work

shadcn/ui reads its theme from CSS variables (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--radius`, …) defined in `index.css` and referenced in `tailwind.config.ts`. **`design.md` owns the values of those variables; this file owns the fact that everything must go through them.**

- Every color, radius, and font in the app resolves to a shadcn CSS variable or a Tailwind token backed by one. No raw hex in component files, ever.
- When `design.md` is (re)generated, the *only* files that should change to restyle the whole app are `index.css` (the variable values) and `tailwind.config.ts` (font family, any extra tokens). Components never change to restyle.
- If a design needs a token shadcn doesn't ship by default (a second accent, a "muted-brand" surface), add it as a new CSS variable following shadcn's naming convention (`--accent-2`, `--surface-raised`) and expose it in the Tailwind config — don't inline it.

### Radius specifically — a known gap worth checking explicitly

shadcn's generated primitives (`Button`, `Input`, `Select`, `Badge`, `Card`, `Dialog`, …) ship with their own Tailwind radius classes (`rounded-md`, `rounded-lg`) out of the box. Those classes only pick up `design.md`'s radius if `tailwind.config.ts`'s `borderRadius` block maps them to `--radius` (the shadcn CLI does this correctly when it scaffolds fresh — the usual failure is a primitive that got hand-edited afterward, or a radius value hardcoded when a component was built before the token wiring was in place). This is the single most common inconsistency in practice — sharp-cornered buttons sitting next to rounded cards — so treat it as a required check, not an assumption:

- After wiring tokens, spot-check `Button`, `Input`, `Badge`, and `Card` side by side. They should visibly share the same radius family.
- If `design.md` defines radius tiers (e.g. shell/card/control/pill), map each shadcn primitive to the *correct tier*, not all to one value — a `Button` is usually a "control" tier, a `Card` the "card" tier; a pill-shaped chip needs `rounded-full` explicitly, not the base radius token.
- Never let a component set its own arbitrary radius (`rounded-[4px]`) instead of the token — that's exactly how drift like this happens.
- **When one rounded element nests inside another** (an image inside a card, a highlighted row inside a menu), matching tiers isn't quite enough on its own — the two curves should share a center or the gap between them looks uneven at the corners. See `polish.md` §1 for the formula (`outer radius = inner radius + inset`) and when to apply it.

### Recurring micro-patterns get ONE shared component, never a per-screen reinvention

`design.md` §8 names exact treatments for things like status indicators and delta/trend values — e.g. "status is a filled colored pill," "a delta is a small pill, not plain text." These are the patterns most likely to quietly degrade during a build: a screen built under time pressure reaches for a plain `<span>` with a colored dot instead of the specified pill, because that's less work and still "shows the status." The fix is structural, not a reminder to try harder:

- Build **one** `StatusBadge` (or equivalently named) component from `design.md` §8's exact spec — filled pill, outline pill, or dot+label, whichever the design actually calls for — the first time status needs to be shown anywhere, and import it everywhere status appears. Same for a `TrendBadge`/delta component, and any other micro-pattern `design.md` names.
- Every screen that shows status or a delta imports the shared component. **Never hand-roll a one-off "simpler" version** on a screen because the full treatment feels like more work in the moment — that per-screen shortcut is exactly how a reference's filled-pill status indicator quietly becomes a bare dot-plus-text by the third screen.
- If a screen seems to need a variant the shared component doesn't support, extend the component (a new `cva` variant) — don't build around it locally.

## Component conventions

### Numerals — tabular-nums before mono

When digits update in place (a live counter, a timer, a stat that refreshes) and shouldn't jitter as they change width, the fix is `font-variant-numeric: tabular-nums` on the UI font already in use — not switching to a mono font. A mono second-family is a legitimate, deliberate voice choice when `design.md` calls for one (an ID, a code-like label), but it's a different decision from "keep these digits stable," and reaching for mono by default when tabular-nums would do is worth avoiding. See `polish.md` §3, including how to verify a font actually supports tabular figures before relying on it.

- **Check `components/ui/` before creating or adding anything.** With a full shadcn catalog typically already present via a detected foundation, what's needed usually already exists — inspect the directory first rather than assuming a primitive is missing. Only run the shadcn CLI to add a component when it's genuinely absent.
- **Build from shadcn primitives; don't rewrite them.** Need a styled button? Use `<Button>` and its variants. Need a new variant? Extend it with `cva` in the wrapper, don't fork the primitive.
- **Composition over configuration.** A screen is composed of small feature components, each built from `ui/` primitives. Keep primitives generic; put project-specific arrangement in the feature layer.
- **Every interactive component handles its states:** default, hover, focus-visible, active, disabled, loading. shadcn gives you most of these — don't strip them.
- **Every data surface handles three data states:** loading (skeleton, not a spinner where a skeleton fits), empty (a designed empty state, never a blank div), and error (a real message with a retry path). This is a structural requirement, independent of what the design looks like.
- **Accessibility is not optional and not the designer's job to remember:** shadcn primitives are accessible by default (focus rings, ARIA, keyboard). Preserve that. Any custom interactive element gets keyboard support and a visible focus state to match.
- Prefer `cn()` for conditional classes. Keep class lists readable; extract to a `cva` variant once a component has more than ~2 style branches.

## What comes from where

| Concern | Source |
|---|---|
| Colors, their roles, radius scale, spacing scale, fonts, icon choices, micro-pattern treatments (status, delta, pagination), component *styling* | `design.md` |
| Stack, file layout, which primitive to use, state handling, a11y, the token bridge, the rule that micro-patterns live in ONE shared component | this file |

If the two ever seem to conflict, it's almost always because a styling decision leaked into this file or a structural decision leaked into `design.md`. Move it to the right side rather than resolving it in a component.
