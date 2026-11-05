# Extracting a design system from a reference (fixed methodology)

This is the procedure `/extract-design` follows to turn a reference image into `design.md`. It is fixed across projects — only its *output* (`design.md`) changes. The goal is a design system precise enough to build from without the reference in hand, and honest about what the reference doesn't show.

## Principle: measure, don't estimate

The single biggest quality difference is sampling real pixel values instead of guessing hex from a rendered image. Guessed palettes drift a few shades off and the result looks "AI-generated" in exactly the way we're trying to avoid.

**If image tooling is available on the machine, use it.** Check and use whichever exists:

```bash
# ImageMagick — sample a single pixel
convert reference.png -format '%[pixel:p{X,Y}]' info:

# or Python + Pillow
python3 -c "from PIL import Image; print('#%02X%02X%02X' % Image.open('reference.png').convert('RGB').getpixel((X,Y)))"
```

Sample the actual pixels for: each brand/accent color, each surface (page, card, raised), each status color, and the darkest and lightest text. Sweep a line of pixels across a gradient to get both stops. **If no tooling is available, read colors visually but mark every hex in `design.md` as `~approx` so it's clear which values need verification.**

## Principle: distrust supplied style tiles

If the reference includes a swatch/token sheet, treat it as a claim to verify, not ground truth. Design exports frequently mislabel or duplicate swatches (a real example from a past extraction: a tile labeled two swatches `#F6F5F9` when the second was actually `#332094`). Sample the swatch's real pixels and, if they disagree with the label, use the measured value and note the correction in `design.md`.

## What to extract — the checklist

Work through all of these; each maps to a section of the `design.md` schema below.

1. **Surfaces** — page background, card fill, any raised/darker surface, borders/hairlines. Note whether the app is light, dark, or framed (a colored shell around a light content area).
2. **Color roles, not just colors.** For every notable color, decide its *job*: brand, single accent/CTA, status (success/warning/danger/info), or neutral. The role matters more than the value — capture the *logic* ("one accent, used only for primary actions and warnings; brand color is separate and never competes with it").
3. **Hierarchy mechanism.** How does the design signal "this is the important thing"? Size (one big numeral), color (one filled card among outlines), weight, or a dark "punctuation" element among light ones. Name it explicitly — it's the thing most likely to be applied inconsistently later.
4. **Radius scale — as concrete numbers, applied to every surface type.** Measure the corner radii in tiers (shell/outer, card, inner control/button, pill/chip) as actual pixel values, not a description. Then explicitly assign each UI element type to a tier: buttons, inputs, and chips are usually the "control" tier; cards and panels the "card" tier; the outer shell (if any) its own tier; anything fully round is the "pill" tier. A radius scale that only says "rounded, ~16px" without saying which elements get which tier is exactly what produces sharp-cornered buttons next to rounded cards later — be explicit per element type.
5. **Typography.** Identify the family or closest free equivalent (name it), the weights actually in use, and the type scale for display numerals, headings, body, and labels. Note any second family used for data/mono (IDs, timestamps, code-like labels) — this split is often a signature.
6. **Signature components.** The 1–3 components that make the design recognizable: a specific chart treatment, a card style, a gauge, a chip, a graph node. Describe them precisely enough to rebuild.
7. **Recurring micro-patterns — the small things that appear on nearly every screen.** These get silently flattened during a build more than anything else, because they never feel "big enough" to write down on their own. Capture each explicitly, even in one line:
   - **Status/state indicator.** Exactly how is state shown — a filled colored pill with text inside it, an outline pill, or a colored dot next to plain text? These read very differently and are not interchangeable; if the reference uses filled pills, say so by name, don't let it default to the plainer dot-plus-label treatment.
   - **Delta/trend indicator.** How is a change shown — "+5.4%" as plain colored text, or wrapped in its own small pill/chip? Name the exact treatment.
   - **Icon containers.** What shape holds an icon next to a stat or label — circular, rounded-square, no container at all? And at what size/tint?
   - **List termination.** How does a long list or table end — numbered pagination, an infinite scroll, or a "Load more" button? Don't leave this to be invented at build time.
   - **Icon set.** Identify the actual icon style (stroke width, rounded vs. sharp caps, outline vs. filled) and, since this kit standardizes on lucide-react, name the closest **lucide-react icon for every icon actually visible in the reference** (e.g. "the stat-card icons map to `DollarSign`, `Clock`, `TrendingUp`, `Banknote`") rather than describing icons only in the abstract.
8. **The one-per-screen punctuation element**, if present — a single dark card, a single gold/accent object — and the rule governing it.
9. **Spacing scale — a real numeric scale, not a density adjective.** Measure or infer actual values for: outer page margin/gutter (or explicitly "edge-to-edge, no outer frame" if the reference shows content running to the viewport edge), the gap between stacked sections, card internal padding, and inline gap between small elements (icon-to-label, chip-to-chip). A 6–8 step scale (e.g. 4/8/12/16/24/32/48/64px) that names which step is used where is the goal — "generous and airy" alone is not enough to build consistent spacing from, and is the direct cause of some sections getting a bottom margin and others not.
10. **Does the reference show a shell/frame, or edge-to-edge content?** State this explicitly and separately from radius/spacing — it's a binary the engineering layer needs and easy to leave implicit. Most references are edge-to-edge; say so plainly rather than leaving it to be assumed either way.

## What to also record — the honesty section

References are usually polished portfolio shots or a single happy-path screen. Capture what they *don't* show, so it gets designed rather than skipped:

- Empty states, error states, loading states — almost never in a reference.
- Behavior at scale (a table with 3 rows vs 300; a graph with 8 nodes vs 200).
- Accessibility gaps — contrast that's stylish but likely below WCAG AA, color-only status coding.

`design.md` ends with a short "What the reference doesn't cover" section listing these, so the engineering half knows to design them fresh rather than assume the reference omitted them on purpose.

## Then: map onto shadcn variables

The last step is translating the extracted system into the shadcn/ui CSS-variable names the engineering half relies on, so components inherit the design with no per-component work. Produce the `:root` (and `.dark` if the design is dark) variable block directly. This block is the contract between `design.md` and every component.

## Writing the file

- Overwrite `design.md` completely (per project policy — a new reference replaces the old system, it does not merge).
- Follow the schema below exactly, including section order and headings, because `engineering.md` and `SKILL.md` refer to these sections by name.
- Keep values concrete. "Blue" is useless; `#2563EB, used only for primary buttons and active nav` is buildable.
- Where you estimated rather than measured, mark it `~approx`.

---

## design.md output schema (produce exactly this structure)

```markdown
# design.md — <reference name or short descriptor>

Extracted from <reference>. Values sampled from pixels unless marked ~approx.
<one line: light / dark / framed, and the overall density feel>

## 1. Corrections to the source
<any mislabeled swatches found, measured value vs. labeled. Omit section if none.>

## 2. shadcn/ui theme variables
```css
:root {
  --background: <hsl or hex>;
  --foreground: ...;
  --card: ...; --card-foreground: ...;
  --primary: ...; --primary-foreground: ...;
  --secondary: ...; --secondary-foreground: ...;
  --muted: ...; --muted-foreground: ...;
  --accent: ...; --accent-foreground: ...;
  --destructive: ...; --destructive-foreground: ...;
  --border: ...; --input: ...; --ring: ...;
  --radius: <base radius>;
  /* extra tokens this design needs, following shadcn naming */
}
/* .dark { ... }  only if the design is dark or has a dark mode */
```

## 3. Color roles
<table or list: each color → its ONE job. The logic, not just values.>

## 4. Hierarchy mechanism
<the explicit rule for how importance is signaled on a screen>

## 5. Typography
<family (+ closest free equivalent, named), weights in use, type scale,
 any second/mono family and what it's reserved for>

## 6. Radius & spacing
<Shell/frame: edge-to-edge or framed — state explicitly.
 Radius tiers with pixel values AND which element types use each tier
 (e.g. shell 24px · cards 16px · buttons/inputs/chips 10px · pills full).
 Spacing scale with pixel values AND where each step applies
 (e.g. page gutter 24px · section gap 32px · card padding 20px · inline gap 8px).
 Density feel in one line.>

## 7. Signature components
<the 1–3 recognizable components, described precisely enough to rebuild,
 with the key Tailwind/CSS specifics>

## 8. Recurring micro-patterns
<status/state indicator (filled pill / outline pill / dot+label — name it exactly);
 delta/trend indicator (plain text vs pill);
 icon container shape and size;
 list termination style (pagination / load-more / infinite scroll);
 icon set: named lucide-react icon for every icon type visible in the reference,
 plus the stroke width to use app-wide>

## 9. What the reference doesn't cover
<empty/error/loading states, scale behavior, a11y gaps — to be designed fresh>






## Composition Fidelity

The reference image's spatial arrangement is part of the design.

When implementing a reference-driven screen, preserve:

- relative component positions
- column count
- row structure
- component width relationships
- component height relationships
- alignment between neighboring cards
- major gutters
- section spacing
- visual grouping
- intentional asymmetry
- placement of navigation, header, content and secondary regions

Do not reorganize components into a generic responsive dashboard layout simply
because another grid arrangement is easier to implement.

If the reference uses:

- 3 columns, preserve 3 columns
- a 2:1 width relationship, preserve it
- a wide chart beside two smaller charts, preserve that hierarchy
- a specific row/column grouping, preserve that grouping

Responsive behavior may adapt the composition at smaller breakpoints, but the
desktop composition should reproduce the reference structure.
```
