# Anti-slop rules (fixed)

"AI slop" is competent, polished UI that no one actually decided — the statistical average of ten thousand interfaces, rendered cleanly. It isn't ugly; that's what makes it hard to catch. The test a designer applies in about three seconds: *does this look like it came from somewhere, or like a model averaged a thousear designs?* This file exists so the output clears that bar.

These rules are synthesized from current (2025–2026) writing by working designers on what specifically reads as machine-made. They are a **floor, enforced at generation time** — not a substitute for stopping and looking at the result, which the loop at the end covers.

Two framing points before the rules:

- **`design.md` is the primary anti-slop weapon.** A real extracted design system — a committed font, a semantic palette, a signature component — is what makes output look authored. These rules are the backstop that stops default patterns creeping back in *between* what `design.md` specifies. If a rule here and `design.md` ever conflict, `design.md` wins; it's the actual decision.
- **Slop is fixed mostly by negation.** Telling the model what *not* to do removes the defaults it would otherwise fill in. That's why much of this file is phrased as bans.

## The banned defaults

These are the specific tells. Do not produce them unless `design.md` explicitly calls for one (it won't, generally):

1. **No Inter / Geist / system-font-as-the-whole-decision.** Type is the fastest signal of authorship, and a default UI font signals no one chose. Use the family `design.md` names. If `design.md` somehow lacks a type decision, that's a gap to fix by re-extraction — not license to reach for Inter.
2. **No purple-to-blue (or purple-to-cyan) gradient**, and no gradient as decoration generally. Gradients are allowed only when `design.md` defines one with a *purpose* (e.g. a brand surface, an AI-authored panel). A gradient named `gradient-start`/`gradient-end` is the tell; a color should be named for what it *does*.
3. **No glassmorphism / neon-glow / frosted-blur** as a default surface treatment. Only if `design.md` establishes it as the house material.
4. **No row of 3–6 identical feature cards**, each an icon + heading + two lines, evenly spaced. This is the single most recognizable slop layout.
5. **No uniform-everything.** Same radius, same padding, same card height across a whole screen flattens hierarchy. Vary deliberately — the primary thing should be bigger/heavier/closer; secondary things should recede. (This is why `design.md` records a *hierarchy mechanism* — apply it.)
6. **No vague hero copy.** "Build the future of work," "Scale without limits," "Your all-in-one platform." Placeholder and demo copy must be specific enough that you could tell what the product does from the headline alone. If you don't know the specifics, use honestly-labeled placeholders, not confident-sounding filler.
7. **No everything-visible-at-once.** Don't surface every table, panel, and control simultaneously because the user "might need it." Use progressive disclosure — show what's needed for the current step. Start from what the user is trying to do, not from the full feature set.
8. **No decorative motion / uniform fade-ins.** Motion must communicate a state change, direct attention, or carry character. Everything fading in on the same 200ms timing is slop. If a movement does none of those three jobs, delete it. (This overrides nothing in `design.md`; it fills the gap where a static reference said nothing about motion.) The sharper version of this rule for high-frequency interactions: **the more often something fires, the less animation it can afford.** Default hover states (background, text, underline) should be instant, not eased — hover can fire many times a second while sweeping a cursor, and an easing delay on each one reads as lag. Same for keyboard-triggered actions (a shortcut-toggled panel): the person already knows what it does, so an eased entrance is friction, not delight. A modal opened once a session can still animate. See `polish.md` §7 for the tooltip exception (a real, deliberate delay on the *first* one, instant after).
9. **No default shadcn look shipped as-is.** shadcn/ui is the *structural* baseline (accessible, composable) — not the *visual* answer. Untuned shadcn defaults (default zinc palette, default radius, default card) are themselves a slop tell. The whole point of the token bridge is that `design.md`'s values replace those defaults.
10. **No accidental spacing or radius drift.** This is a different failure from #5 above — #5 is about *deliberately* flattening hierarchy; this is about elements silently not following the system at all. A button with sharp corners next to 16px-radius cards, or one section with a bottom margin while an identical adjacent section has none, isn't a style choice anyone made — it's the tell that spacing/radius was improvised per-component instead of pulled from `design.md`'s scale. Every radius and every spacing value on screen should be traceable to a named tier in `design.md` §6; if you can't name which tier a value came from, it's drift, not design.
11. **No non-lucide-react icons, and no silently downgraded micro-patterns.** Two related failures, both invisible until you compare against the reference side by side: an icon that isn't a named `lucide-react` import (an inline SVG, an emoji, a different icon set brought in for one component), and a signature micro-pattern (§8 of `design.md` — status indicators, delta badges, pagination) quietly built *plainer* than specified — a filled status pill becoming a bare dot-plus-text, a trend pill becoming plain colored text. Neither looks obviously wrong in isolation; both are immediately visible next to the reference. Check both explicitly rather than trusting that "it looks fine" means it matches.

## The required floor (the invisible half)

Slop is as much what's *missing* as what's generic. These are non-negotiable and rarely present in a reference, so they must be built without being asked:

- **The three data states, every time:** loading (skeleton where it fits, not a bare spinner), empty (a designed state that tells the user what to do next and makes them want to), and error (human-language message with a retry path). The happy path alone is a slop signature — the demo always has data.
- **Real interaction states:** default, hover, focus-visible, active, disabled. Never strip shadcn's focus ring for looks.
- **Accessibility as a floor, not a finish:** WCAG AA contrast (cinematic-but-dim palettes frequently fail — verify, don't assume), keyboard operability, no status conveyed by color alone (pair with icon/label). Research consistently finds AI-generated markup skews inaccessible; treat that as your known failure mode and check for it.

## Semantic-not-decorative, as a habit

Everything on screen should be explainable by what it *does*, not how it looks. A color means "primary action" / "warning" / "success" — not "brand-y." A size difference means "this matters more." A motion means "this changed." If you can't say what an element communicates, it's decoration standing in for a decision — cut it or make it mean something. (The designer's deletion test: anything you can remove without missing it was slop to begin with.)

## The loop — the part that actually beats slop

A checklist alone doesn't defeat slop; several sources make this point directly, and it's worth taking seriously rather than treating this file as a lint pass. Slop survives because generation is one-shot: build, glance, ship. What beats it is refusing to ship on the first pass. After building any screen or component:

1. **Build** to `design.md` + `engineering.md`, with the bans above enforced from the start.
2. **Critique** against this file honestly. Walk the acceptance bar below, item by item, and name what fails — don't rationalize it.
3. **Fix** the highest-impact failure.
4. **Re-check.** Repeat until the bar is green or you've hit a real budget, then say plainly what still doesn't pass.

Do this *before* presenting the work as done, not after the user points at it.

## Acceptance bar

A screen is not done until all of these are true. Check them explicitly:

- [ ] The font is a deliberate choice from `design.md`, not a default UI sans.
- [ ] Every color maps to a semantic role; no decorative gradient; no purple-blue hero.
- [ ] One clear focal element per screen; hierarchy is visible, not uniform.
- [ ] Every radius on screen (buttons included) and every spacing gap traces to a named tier in `design.md` §6 — no sharp-cornered button among rounded cards, no section with a margin its neighbor lacks.
- [ ] No outer page padding/frame was added unless `design.md` explicitly defines one — content is edge-to-edge by default.
- [ ] Every icon is a named `lucide-react` import at a consistent stroke width — none swapped for a look-alike, an inline SVG, or an emoji.
- [ ] Status indicators, delta badges, and any other micro-pattern in `design.md` §8 are built to their specified treatment (filled pill, etc.), not a plainer one-off version — checked against a shared component, not per-screen.
- [ ] No identical-feature-card row; no everything-at-once layout.
- [ ] Placeholder copy is specific, not vague demo filler.
- [ ] Loading, empty, and error states exist and are designed, not stubbed.
- [ ] Hover / focus-visible / active / disabled all present; focus ring intact.
- [ ] Contrast passes AA; no color-only status; keyboard-operable.
- [ ] Motion (if any) communicates, directs, or characterizes — nothing decorative. Hover states are instant by default; only a first tooltip in a session gets a delay.
- [ ] Images and avatars have the faint inset outline from `polish.md` §4 — nothing pale is floating edgeless on its card.
- [ ] Nothing on screen is unexplainable by what it does.
- [ ] Final gut check: does this look like it came from *this* product, or could it belong to any SaaS? If the latter, it's not done.

The last item is the one a checklist can't fully capture, and it's the one that matters most. If a screen passes every box but still feels authorless, that feeling is the real signal — keep going.
