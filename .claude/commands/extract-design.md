---
description: Extract a design system from a pasted reference image and overwrite design.md
---

You are extracting a project's design system from a reference image the user has pasted into this conversation.

If no image is present, ask the user to paste the design reference before continuing — do not proceed without it.

Follow the fixed methodology in `.claude/skills/frontend-kit/references/extracting.md` exactly:

1. Read `extracting.md` in full first.
2. Analyze the pasted reference against its checklist. **Sample real pixel values** using ImageMagick or Python/Pillow if either is available on this machine (see the commands in that file); only fall back to visual estimation if no tooling exists, marking estimated values `~approx`.
3. Distrust any swatch/token sheet in the reference — verify swatches against their actual pixels and note corrections.
4. Produce the design system following the exact `design.md` output schema at the end of `extracting.md` — including the shadcn/ui theme-variable block, which is the contract the rest of the kit builds against, and §8's recurring micro-patterns (status/delta treatment, icon containers, list termination). For every icon visible in the reference, name its closest `lucide-react` equivalent explicitly — this kit uses lucide-react exclusively, so a vague description of "icon style" isn't enough to build from.
5. **Overwrite** `.claude/skills/frontend-kit/references/design.md` completely with the result. Do not merge with or append to existing content — a new reference replaces the old system.

A good extraction is itself the strongest defense against generic AI output, so make sure `design.md` commits to the three highest-leverage anti-slop decisions: a deliberate, named typeface (never leave type as a default), a *semantic* palette where every color has a stated job rather than a decorative role, and a named `lucide-react` icon for every icon type the reference shows (never leave icons as a vague style description). If the reference is too sparse to determine any of these, say so explicitly in the "What the reference doesn't cover" section rather than silently defaulting.

After writing, summarize back to the user in a few bullets: the palette and each color's role, the hierarchy mechanism, the type pairing, the recurring micro-patterns (especially status/delta treatment, since these are the most commonly under-built), and anything you corrected or had to estimate. Then remind them that only `index.css` and `tailwind.config.ts` need updating to apply it, since components route through the tokens.

$ARGUMENTS
