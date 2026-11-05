# design.md — Enterprise AI OS desktop (authored, not extracted)

**Authored by hand from `context.md` §11.1 (Phase 1 design objective), not extracted from a
reference image.** No pixel sampling was possible. If a visual reference is supplied later, run
`/extract-design` to replace this file; components route through tokens, so only `src/index.css`
needs to change.

Light-theme first. A calm, cool-grey desktop canvas with white "paper" surfaces (windows, widgets,
dock) floating on it. Medium density: readable enterprise data, never a wall of KPIs.

## 2. shadcn/ui theme variables

Lives in `src/index.css` (`:root`). Summary of the light values:

```css
:root {
  --background: oklch(0.958 0.006 255);   /* desktop canvas */
  --foreground: oklch(0.22 0.018 262);    /* ink */
  --card: oklch(1 0 0);                   /* windows, widgets, dock */
  --popover: oklch(1 0 0);
  --primary: oklch(0.48 0.14 256);        /* one confident enterprise blue */
  --primary-foreground: oklch(0.985 0.002 255);
  --secondary / --muted: oklch(0.962 0.005 255);
  --muted-foreground: oklch(0.5 0.016 262);
  --accent: oklch(0.948 0.02 256);        /* selected rows, active nav */
  --accent-foreground: oklch(0.36 0.12 258);
  --destructive: oklch(0.56 0.2 27);
  --border / --input: oklch(0.908 0.007 255);
  --ring: oklch(0.55 0.14 256);
  --radius: 0.625rem;

  /* extra tokens */
  --chrome            /* window title bar, app sidebars */
  --success|warning|info|danger      (+ -soft background, -ink text)
  --tint-blue|teal|amber|coral|graphite   /* application identity */
  --elevation-widget|window|window-active|dock|overlay   → shadow-* utilities
}
```

## 3. Color roles

| Token | One job |
|---|---|
| `background` | The desktop canvas only. Never used inside a window. |
| `card` | Every surface that floats on the canvas: windows, widgets, dock, panels. |
| `chrome` | Window title bars and in-app sidebars — separates frame from content. |
| `primary` | Primary action, focus, the *focused* window/dock indicator. One per view. |
| `accent` / `accent-foreground` | Current selection: selected row, active nav item. |
| `muted-foreground` | Secondary text, metadata, timestamps. |
| `success` / `warning` / `danger` / `info` | Status only (always paired with a label; never color alone). |
| `tint-*` | Application identity in app icons. Never used for status or actions. |

## 4. Hierarchy mechanism

Elevation + weight, not color. The focused window carries `shadow-window-active` and a full-ink
title; unfocused windows drop to `shadow-window` and a muted title. Inside a view, the focal item
is a semibold `text-base`/`text-lg` title; everything else is `text-sm` regular, metadata
`text-xs` muted. Color is reserved for status and the single primary action.

## 5. Typography

- Family: **Geist Variable** (self-hosted via `@fontsource-variable/geist`) — a deliberate choice
  for an OS-like product: neutral, highly legible at 12–14px, ships tabular figures.
- Weights: 400 body, 500 labels/controls, 600 titles. No 700+.
- Scale: `text-xs` (12) metadata · `text-sm` (14) default UI · `text-base` (16) panel titles ·
  `text-lg` (18) view titles · `text-2xl` (24) single stat figures.
- All numbers that are compared or update: `tabular-nums`. No mono family.

## 6. Radius & spacing

Shell: **edge-to-edge desktop** (no frame). Windows, widgets and dock float on it.

Radius tiers:
- dock / overlays: `rounded-2xl` (~18px)
- windows, widgets: `rounded-xl` (~14px)
- app icons (52px): `rounded-[--radius-icon]` → `rounded-xl`; dock icons (40px) `rounded-lg`
- inner cards, buttons, inputs: `rounded-lg` (10px) — shadcn default for controls
- status badges, counts: `rounded-full`

Spacing scale (Tailwind steps):
- `1` (4px) icon-to-text inside a badge
- `2` (8px) inline gaps, dock item gap
- `3` (12px) list row padding, widget internal gap
- `4` (16px) widget/card padding, window content padding
- `6` (24px) desktop gutter, section gaps inside a view
- `8` (32px) gap between desktop icon area and widget column

Fixed shell metrics: top bar 36px (`h-9`), dock 60px tall, dock reserve 84px.

## 7. Signature components

1. **Window frame** — `bg-card rounded-xl border` + elevation; 40px `bg-chrome` title bar with
   app icon (20px), title, and right-aligned minimize / maximize / close ghost icon buttons.
2. **Dock** — centred floating `bg-card/95 rounded-2xl border shadow-dock` bar; 40px app icons;
   running indicator is a 4px dot under the icon (`bg-muted-foreground`), focused is a 16px
   `bg-primary` bar, minimized is a hollow ring dot.
3. **App icon** — solid `tint-*` squircle with a white lucide glyph. Folders are a `bg-card`
   squircle showing a 2×2 grid of member app icons.

## 8. Recurring micro-patterns

- **Status: soft pill with leading dot** — `StatusBadge` (`src/components/os/StatusBadge.tsx`):
  `rounded-full bg-{tone}-soft text-{tone}-ink`, 6px dot in `bg-{tone}`, label text. Tones:
  success, warning, danger, info, neutral. Always includes a text label.
- **Mock-data marker** — `MockBadge`: outline pill, `FlaskConical` icon, "Mock data". Every
  surface showing fabricated numbers carries one (or its container does).
- **Delta/trend:** not used in Phase 1 (no time-series claims).
- **Icon containers:** app identity → tinted squircle; generic list icons → bare 16px muted icon.
- **List termination:** finite lists; no pagination in Phase 1.
- **Icon set (lucide-react, strokeWidth 2 everywhere):** launcher `LayoutGrid`, assistant
  `Sparkles`, notifications `Bell`, settings `Settings`, folder `Folder`, close `X`, minimize
  `Minus`, maximize `Maximize2`, restore `Minimize2`, search `Search`, Claims `ShieldCheck`,
  Document AI `ScanText`, Workflow Studio `Workflow`, Analytics `ChartColumn`, System Explorer
  `Compass`, agents `Bot`, workers `Cpu`, connectors `Plug`, domain packs `Library`, activity
  `History`, health `Activity`, approvals `ClipboardCheck`, mock `FlaskConical`.

## 9. Not covered / designed fresh

- Dark mode: not designed for Phase 1 (`.dark` keeps neutral values).
- Motion: windows open with a 120ms fade/zoom (communicates a new surface). Hover is instant.
  Minimize/restore is instant.
- Loading states: Phase 1 data is synchronous mock data; skeletons appear only where a view
  simulates loading (Document AI preview).
