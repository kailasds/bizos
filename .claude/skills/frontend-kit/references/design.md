# design.md — NOT YET EXTRACTED

**This project has no design system yet.** This file is a placeholder.

To generate it: paste your design reference image into Claude Code and run `/extract-design`.
That reads the reference, extracts the design system (colors, type, radius, components,
and the shadcn theme variables), and overwrites this file.

Until then, do not build styled UI — there are no tokens to build against. If you build
anything now, build structure only (layout, component composition) using neutral shadcn
defaults, and leave restyling for after extraction.

---

<!-- After /extract-design runs, this file follows the schema in
     references/extracting.md §"design.md output schema":
     1. Corrections to the source
     2. shadcn/ui theme variables
     3. Color roles
     4. Hierarchy mechanism
     5. Typography
     6. Radius & spacing
     7. Signature components
     8. Recurring micro-patterns (status/delta treatment, icon containers,
        list termination, named lucide-react icon set)
     9. What the reference doesn't cover
-->
