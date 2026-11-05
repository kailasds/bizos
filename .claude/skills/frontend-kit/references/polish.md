# Polish (fixed)

Small, concrete interface details — distilled from [Craft](https://craft.gustavofior.com) by Gustavo Fior (MIT-licensed collection of design-engineering concepts). These are refinements applied *after* a screen already follows `engineering.md`, `design.md`, and clears `anti-slop.md` — they're what separates "correct" from "considered." Apply them where they fit; none of them override `design.md`.

Two of these (concentric radius, icon optical alignment) extend rules already in `engineering.md` — that's noted inline. The rest are additive techniques to reach for deliberately, not defaults to apply everywhere.

---

## 1. Concentric radius (extends `engineering.md`'s radius-tier rule)

When one rounded box sits inside another, the two curves should share a center — otherwise the gap between them looks uneven, wider at the corner than along the edge. `engineering.md` already requires radius tiers (shell/card/control/pill); this is the formula that makes nested tiers actually look nested rather than just "also rounded":

> **outer radius = inner radius + inset**  (inset = the padding/gap between the two edges, plus any border width)

Or, starting from the outer radius (the more common case in a design system):

> **inner radius = outer radius − inset**

If that goes negative, use a square inner corner rather than a negative radius. When applying `design.md`'s tiers to a specific nested pair (e.g. a card's outer radius and an image or button inset inside it), check this relationship rather than picking two tier values that merely both "look rounded" — a 16px outer radius with a 12px inset needs a 4px inner radius, not whatever the nearest tier happens to be. Tune by eye when the inset varies around the shape or the inner element doesn't reach the corner; the formula is a strong start, not a substitute for looking at it.

## 2. Icon optical alignment (extends `engineering.md`'s icon rule)

A lucide-react icon centered by its bounding box often doesn't *look* centered — different shapes carry different visual weight. This is a per-icon nudge, not a global rule, and only worth doing for icons that sit alone in a prominent, deliberately-centered spot (an icon-only button, a large empty-state icon) — not worth the effort for icons inline with text.

- **The blur test**: blur the icon heavily (dev tools filter, or just squint) until it collapses into a soft blob. The blob sits where the icon's visual weight actually is — nudge the icon back toward center from there, then keep the nudge. A play/triangle icon typically needs a 1px nudge in the direction it points; asymmetric shapes are the usual offenders.
- **Icon-in-button padding**: an icon has empty space inside its own box, which reads as extra padding on that side. Equal padding left and right of an icon ends up looking heavier on the icon side — shave a couple of pixels off the padding on the icon's side rather than keeping it numerically equal.
- **Shape weight in a shared container**: a circle or triangle inside the same bounding box as a square reads as smaller. If a set of icons (say, in a stat-card row) mixes shapes, the round/triangular ones may need to be drawn slightly larger to read as the same size as the square ones.

```css
.play-icon { transform: translateX(1px); } /* nudge toward the point */
```

## 3. Numerals: reach for tabular-nums before reaching for mono

This kit has used monospace fonts liberally for IDs, timestamps, and data labels in past projects — that's a legitimate *voice* choice when `design.md` calls for it (a mono second-family is a real signature in some references). But when the actual goal is just "these digits shouldn't jitter as they update" — a live counter, a price, a stat that refreshes — the fix is `font-variant-numeric: tabular-nums` on the *existing* UI font, not switching to mono by default. Mono changes the whole voice of the interface; tabular figures just stop the digits from reflowing.

- Apply `tabular-nums` to: live counters, timers, table numeric columns, any stat that updates in place.
- **Verify the chosen font actually ships tabular figures** — not every font does. Check with [Wakamai Fondue](https://wakamaifondue.com) (drop in the font file, look for `tnum` in its feature list) before relying on it; if the font lacks it, `tabular-nums` is a silent no-op.
- Right-align numeric table columns regardless — it keeps values of different lengths anchored to the same edge, which is most of what makes a numeric column scannable.

```css
.numeric { font-variant-numeric: tabular-nums; }
```

## 4. Image and avatar outlines

A pale image on a light card, or an avatar that's mostly white, has no visible edge and floats on the surface — a small, easy-to-miss "unfinished" tell. Fix: a faint inset outline drawn *on top of* the image's outermost pixels (not a `border`, which takes up layout space and pushes content).

- ~10% opacity is the working range — below ~5% it disappears against a pale image, above ~20% it reads as an intentional frame rather than a fix.
- Black at 10% in light mode, white at 10% in dark mode.
- Use `outline` with a negative `outline-offset` (or an inset `box-shadow`) so it doesn't affect box size.

```css
img {
  outline: 1px solid rgb(0 0 0 / 0.1);
  outline-offset: -1px;
}
.dark img { outline-color: rgb(255 255 255 / 0.1); }
```

Worth doing on every avatar in a project by default — they're small, often pale, and this is the single case where the "floating" tell is most visible.

## 5. Noise, for a surface that reads too flat

A texture layer for large, single-color surfaces that feel too clean/flat — an AI-panel gradient card, a hero, a dark shell frame. Not a default treatment; reach for it when a specific surface already established in `design.md` needs it, not as a decoration to add everywhere.

- 6–10% opacity, `mix-blend-mode: overlay`, generated via an SVG `feTurbulence` filter.
- **The container needs `isolation: isolate`** — without it, the blend mode reaches past the surface to whatever's behind it (including the page background), and the effect changes depending on where the card sits.
- **Performance**: live `feTurbulence` re-renders per pixel on every repaint. Fine on a card a few hundred pixels wide; can drop a full-screen animated/scrolling hero to single-digit frame rates on a low-end device. For anything large or moving, render the noise once as a small tiled SVG data-URI background instead of a live filter — visually identical, effectively free after first paint.

```html
<svg class="absolute size-0" aria-hidden="true">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
  </filter>
</svg>
<div class="relative isolate overflow-hidden rounded-2xl bg-[--primary]">
  <div class="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay [filter:url(#grain)]" />
</div>
```

## 6. Root/html background, for dark themes

A dark-themed app can show a white flash behind it during overscroll bounce (notably Safari) if only a wrapper `<div>` or `<body>` has the dark background — the document canvas itself (the `<html>` element) is still whatever the browser default is. Set the background on `html` directly, using the same token as the app background, and keep it in sync across theme changes:

```css
html { background-color: var(--background); }
```

Cheap, easy to forget, and specifically relevant to this kit's darker `design.md` outputs (the indigo/cosmic-themed extractions built earlier in this kit's use).

## 7. Hover restraint — sharpens `anti-slop.md`'s motion rule

`anti-slop.md` already bans decorative/uniform fade-ins; this is the sharper, positive version of that rule specifically for hover and other high-frequency interactions:

> **The more often an interaction fires, the less animation it can afford.**

Hover fires far more than any other interaction — sweeping a cursor across a nav can cross ten items in under a second. If each one fades or eases in, the UI is perpetually a frame behind the cursor and reads as slow even when nothing is actually slow.

- **Default hover state changes (background, text color, underline) should be instant — no transition** — not a 150–200ms ease. This is a deliberate exception to the general "give interactive states a short transition" instinct: hover is the one state that should usually skip it.
- **Tooltips are the one hover case that benefits from a delay** — without one, tooltips pop up on every pass-through motion. First tooltip in a session: 400–700ms delay. Once one has appeared, its siblings (moving pointer to an adjacent tooltipped element) should appear instantly — the person has already shown they want the labels.
- **Keyboard-triggered actions should be instant too**, by the same logic — someone toggling a panel with a shortcut already knows what it does and is your fastest possible user; a 250ms slide animation reads as a delay imposed on them, not a delight.
- The dividing line is frequency and intent, not input device: a modal opened once a session can animate; a sidebar toggled forty times a day should not.
