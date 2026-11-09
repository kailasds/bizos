# design.md — Enterprise AI OS · Liquid Glass desktop

**Extracted from two reference images:** (1) a desktop with a glass file-explorer window, a
quick-settings panel, a notification panel, a glass dock and a top bar over a teal-sky /
snow-mountain wallpaper (2000×1126); (2) a glass start menu (1504×1128). Values were sampled
from real pixels with Pillow. The images are ~1.3× logical scale, so sizes were divided by 1.3;
any size marked `~approx` is estimated from edge profiles, not exact.

**Light mode only.** The reference shows no dark mode. The dark block below is inferred and
must be verified against real screens before it is relied on.

House material: **liquid glass**. Chrome (top bar, dock, launcher, sidebars, side panels) is
translucent and blurred over a photographic wallpaper. Content (window panes, tables, forms) is
opaque white. Glass is the house material here, so this is not decorative glassmorphism, but it
has one rule: **glass frames content and never carries content-dense text.**

## 1. Corrections to the source

- **Glass colours are not real colours.** The panel greys (#E9EFF2, #ECEEEE, #D7D7D7, #DBE1E4)
  are translucent white mixed with whatever wallpaper sits behind. They are modelled as
  `white / α + blur`, never as flat hex. The notification panel samples darker (#D7D7D7) only
  because it sits over rock, so it is the same material, not a darker token.
- **The dock indicator blue #2891E6 fails AA as text on white** (≈3.4:1). It is kept for
  indicators, icons and focus only. `--primary` is the darker sampled blue #1475BF (≈4.9:1 on
  white).
- **Window-control yellow #FDDE15 is unusable for text** (≈1.3:1 on white). Warning text uses a
  derived ink `oklch(0.54 0.11 88)` (`~approx`, chosen for ≥4.5:1, not sampled).
- **Window controls are ordered green / yellow / red on the right** (maximize, minimize,
  close), not the macOS left-hand red/yellow/green. This was kept as observed.
- **Text on glass in the reference is near-black on light glass.** That contrast holds only
  over the pale sky. Over the darker rock/snow the reference itself drops toward ~4:1. The
  remedy is a higher glass opacity floor (see §2 `--glass`), not lighter text.
- **No status chips, deltas or tables appear in the reference.** The data-status treatment in
  §8 is carried forward from the product and recoloured. It is an inference, flagged in §9.

## 2. shadcn/ui theme variables

```css
:root {
  --radius: 0.75rem;   /* Tailwind scale: rounded-md ≈10px inputs · rounded-lg 12px tiles · rounded-xl ≈17px / rounded-2xl panels & windows */

  /* Opaque content */
  --background: oklch(0.948 0.008 229);       /* #E9EFF2 — fallback canvas under the wallpaper */
  --foreground: oklch(0.156 0.005 197);       /* #0A0D0D — primary text */
  --card: oklch(1 0 0);                       /* #FFFFFF — window content pane */
  --card-foreground: oklch(0.156 0.005 197);
  --popover: oklch(1 0 0 / 0.86);             /* glass, see --glass-strong */
  --popover-foreground: oklch(0.156 0.005 197);

  /* Action */
  --primary: oklch(0.549 0.141 248);          /* #1475BF — buttons, links, selected text */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(1 0 0 / 0.62);           /* glass tile at rest */
  --secondary-foreground: oklch(0.156 0.005 197);
  --muted: oklch(0.962 0.003 165);            /* #F1F3F2 — selected tree row, quiet fill */
  --muted-foreground: oklch(0.566 0 0);       /* #767676 — inactive breadcrumb, metadata */
  --accent: oklch(1 0 0 / 0.72);              /* hover on glass */
  --accent-foreground: oklch(0.156 0.005 197);
  --destructive: oklch(0.600 0.222 25);       /* #E72935 — close control, destructive */

  --border: oklch(0.955 0 0);                 /* #F0F0F0 — dividers inside white panes */
  --input: oklch(0.881 0.007 220);            /* #D3D9DB — slider track, input outline */
  --ring: oklch(0.641 0.157 248);             /* #2891E6 — focus, running indicator */

  /* Liquid glass material (new tokens) */
  --glass: oklch(1 0 0 / 0.66);               /* sidebars, dock, quick panel (~approx α) */
  --glass-strong: oklch(1 0 0 / 0.84);        /* launcher, popovers, text-heavy glass */
  --glass-dark: oklch(0.525 0.067 209 / 0.55);/* #35757F tint — top bar */
  --glass-dark-foreground: oklch(0.94 0.03 228); /* #D3EDF9 — top-bar text */
  --glass-border: oklch(1 0 0 / 0.45);        /* 1px inner highlight edge */
  --glass-blur: 28px;                         /* ~approx, 24–40px range */
  --glass-saturate: 1.6;                      /* ~approx */

  --wallpaper:
    radial-gradient(120% 60% at 70% 100%, oklch(0.62 0.03 220 / 0.9), transparent 60%),
    linear-gradient(180deg,
      oklch(0.615 0.087 209) 0%,              /* #3793A1 sky */
      oklch(0.700 0.061 213) 28%,             /* #71A9B5 */
      oklch(0.861 0.014 208) 55%,             /* #C7D4D6 mist */
      oklch(0.921 0.032 55) 72%,              /* #F7E0D1 warm horizon */
      oklch(0.55 0.05 50) 86%,                /* #7D4F35-ish rock, ~approx */
      oklch(0.70 0.02 215) 100%);             /* #94A3AA snow/cloud */

  /* Status */
  --success: oklch(0.673 0.164 154);          /* #1DB264 — battery-saver leaf */
  --success-soft: oklch(0.673 0.164 154 / 0.14);
  --success-ink: oklch(0.50 0.13 152);        /* derived from #249851, AA on white */
  --warning: oklch(0.899 0.184 99);           /* #FDDE15 — minimize control */
  --warning-soft: oklch(0.899 0.184 99 / 0.22);
  --warning-ink: oklch(0.54 0.11 88);         /* derived, ~approx */
  --info: oklch(0.641 0.157 248);             /* #2891E6 */
  --info-soft: oklch(0.641 0.157 248 / 0.12);
  --info-ink: oklch(0.549 0.141 248);         /* #1475BF */
  --danger: oklch(0.600 0.222 25);            /* #E72935 */
  --danger-soft: oklch(0.600 0.222 25 / 0.12);
  --danger-ink: oklch(0.499 0.177 27);        /* #B22525 */

  /* Window controls (sampled) */
  --control-maximize: oklch(0.725 0.212 138); /* #57C323 */
  --control-minimize: oklch(0.899 0.184 99);  /* #FDDE15 */
  --control-close: oklch(0.600 0.222 25);     /* #E72935 */

  /* Elevation: soft, wide, low-alpha; glass floats */
  --elevation-widget: 0 8px 24px -8px oklch(0.25 0.03 220 / 0.22);
  --elevation-window: 0 18px 48px -12px oklch(0.25 0.03 220 / 0.30);
  --elevation-window-active: 0 24px 64px -12px oklch(0.25 0.03 220 / 0.38);
  --elevation-dock: 0 10px 30px -10px oklch(0.25 0.03 220 / 0.30);
  --elevation-overlay: 0 30px 80px -16px oklch(0.20 0.03 220 / 0.40);

  --chart-1: oklch(0.549 0.141 248);
  --chart-2: oklch(0.615 0.087 209);
  --chart-3: oklch(0.673 0.164 154);
  --chart-4: oklch(0.75 0.15 75);
  --chart-5: oklch(0.600 0.222 25);
}

/* Inferred dark mode, NOT in the reference */
.dark {
  --background: oklch(0.22 0.02 220);
  --foreground: oklch(0.96 0.005 220);
  --card: oklch(0.26 0.015 220);
  --card-foreground: oklch(0.96 0.005 220);
  --glass: oklch(0.22 0.02 220 / 0.55);
  --glass-strong: oklch(0.22 0.02 220 / 0.78);
  --glass-border: oklch(1 0 0 / 0.12);
  --muted: oklch(0.30 0.012 220);
  --muted-foreground: oklch(0.72 0.01 220);
  --border: oklch(1 0 0 / 0.08);
  --primary: oklch(0.68 0.15 248);
  --primary-foreground: oklch(0.15 0.02 248);
}
```

Glass recipe (one utility, e.g. `.glass` in `index.css`):
`background: var(--glass); backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
border: 1px solid var(--glass-border); box-shadow: var(--elevation-…)`. Provide an
`@supports not (backdrop-filter: blur(1px))` fallback to `--glass-strong`, and a
`prefers-reduced-transparency` fallback to opaque `--card`.

## 3. Color roles

| Token | Job |
|---|---|
| `--wallpaper` | The backdrop glass refracts. It is the only large-area colour on screen. |
| `--glass` / `--glass-strong` | Chrome: sidebars, dock, quick panel, notifications (`--glass`). Launcher, menus and popovers with reading text (`--glass-strong`). |
| `--glass-dark` + foreground | Top bar only: a dark teal tint with pale text. |
| `--card` (white) | Where work happens: window content panes, forms, tables, record detail. |
| `--muted` | Selected row in a glass sidebar or tree; quiet fills. |
| `--primary` #1475BF | The one action colour: primary buttons, links, selected-tab text. |
| `--ring` / `--info` #2891E6 | Running-app indicator, focus ring, active toggle icon, informational icons. Never body text. |
| `--success` #1DB264 | "On / healthy / complete." Seen on the active Battery Saver toggle. |
| `--warning` #FDDE15 | Fill only (minimize dot, soft backgrounds). Text uses `--warning-ink`. |
| `--danger` #E72935 | Close control, destructive actions, failed/blocked status. |
| `--muted-foreground` #767676 | Inactive breadcrumb segments, metadata, timestamps, inactive toggle labels. |
| Folder yellow #FBDB15 / tab #FDF1A1 | Folder glyphs only, through `--tint-amber`. Never status. |

## 4. Hierarchy mechanism

**Material, then whiteness.** Depth is told by material, not by borders or strong colour:

1. Wallpaper, the farthest layer.
2. Glass chrome over it: dock, top bar, side panels.
3. Floating windows, separated by ~16px gaps (`~approx`, ~22px image) rather than overlap.
4. Inside a window, two tones: a glass sidebar (~245px logical, `~approx`) beside an opaque
   white content pane. White means "this is the content."
5. The active item is the whitest thing in its group: a white quick tile, a white dock tile, a
   `--muted` tree row.

Colour is reserved for state (indicator, toggle icon, status). Shadow is soft and wide and only
separates floating layers. Inside panes, separation is a 1px `#F0F0F0` hairline or whitespace.

## 5. Typography

- **Typeface: Plus Jakarta Sans** (`~approx`). The reference uses a rounded geometric
  grotesque with open apertures and a single-storey feel at small sizes. Plus Jakarta Sans is
  the closest free match. It needs `@fontsource-variable/plus-jakarta-sans`, a new dependency.
  Numerals use `tabular-nums` for times and counts.
- One family, with weight carrying hierarchy:

| Role | Size (logical) | Weight |
|---|---|---|
| Window/section title | 18px | 600 |
| Sidebar item / list primary | 15px (~20px image) | 500 |
| Body | 14px | 400 |
| Label / tile caption | 12–13px (~16px image) | 500 |
| Section label ("Quick Access") | 12px, muted #394040 | 600 |
| Top-bar clock | 13px, `--glass-dark-foreground` | 500 |

- No uppercase-tracking eyebrows. Section labels are sentence case and slightly bolder.

## 6. Radius & spacing

| Element | Radius |
|---|---|
| Window, panels, dock, launcher | ~16px (`rounded-xl` / `rounded-2xl`) |
| Quick tiles, cards inside panes | 12px (`rounded-lg`) |
| Search field, inputs | ~10px (`rounded-md`) |
| Window controls, toggles, avatars, indicators | full |

Spacing is airy:
- 16px gaps between floating surfaces.
- 12px padding inside tiles.
- 8px between sidebar rows (row height ~32px logical, `~approx`).
- Dock icons ~37px logical (~48px image) on a 12px gutter.
- The top bar is ~36px logical.

## 7. Signature components

- **Window.** A 16px-radius frame with no visible title-bar fill. The top of the glass sidebar
  is the title area. Controls sit at the top right as three filled 12px circles (green
  maximize, yellow minimize, red close). On hover a glyph appears inside each: `Maximize2`,
  `Minus`, `X`. The content pane is white with a 1px hairline from the sidebar. The active
  window takes `--elevation-window-active`.
- **Glass sidebar / tree.** Rows show icon + label, with a `ChevronRight`/`ChevronDown`
  disclosure. The selected row is a `--muted` pill (10px radius). Folder glyphs are tinted.
- **Search field.** Glass-on-white, `#E8F1F3` sampled, 10px radius, a leading `Search` icon,
  no outline at rest, and a `--ring` focus ring.
- **Quick-settings panel.** A glass card holding a grid of 3-up tiles plus two sliders
  (`Sun`, `Volume2`). Slider track `--input`, fill white, thumb white with shadow.
- **Notification panel.** A glass column with a "Clear all" ghost action in muted text, and
  stacked notification cards on `--glass-strong`.
- **Dock.** A centred glass bar with 16px radius and white app tiles. The running app has a
  short 3px × 16px `--ring` bar under its tile. The focused app also gets a white tile
  background.
- **Top bar.** A full-width `--glass-dark` strip. Left: launcher (`LayoutGrid`). Right: status
  glyphs (`Cloud`, `Wifi`, `Battery`, `ChevronDown`) and the clock.
- **Launcher / start menu.** A large `--glass-strong` sheet with a search field on top, a
  pinned-app grid with icon tiles and 12px captions, and a footer with user + `Power`.

## 8. Recurring micro-patterns

- **Toggle state (observed).** On = a solid white tile with a coloured icon (`--info` blue, or
  `--success` green for savers) and a dark label. Off = a transparent glass tile with a grey
  #AFB2B1 icon and a muted label. State is told by fill + icon colour together, never colour
  alone.
- **Running indicator (observed).** A short `--ring` bar under a dock tile. Not a dot.
- **Selection (observed).** The whitest surface wins: a white tile on glass, or a `--muted`
  row in a sidebar.
- **Data status (inferred).** Keep the shared `StatusBadge`: a soft pill (`--*-soft` bg,
  `--*-ink` text) with a leading 6px dot in the solid colour. On glass, render the pill on
  `--glass-strong` so it stays legible.
- **Delta (not shown, inferred).** `TrendingUp`/`TrendingDown` + a signed value in
  `--success-ink`/`--danger-ink`, `tabular-nums`. Never colour alone.
- **Icon containers.** App icons sit in 12px-radius tiles with a tinted soft background
  (`--tint-*`). Inline UI icons sit bare at 16px with stroke 1.75.
- **List termination.** Lists end on whitespace; no trailing divider. Panels end with a ghost
  action ("Clear all", "All apps") right-aligned in muted text.

**Icon map (lucide-react, every visible icon):**

| Group | Icons |
|---|---|
| Search and disclosure | Search → `Search` · chevrons → `ChevronDown` / `ChevronUp` / `ChevronRight` |
| Navigation and view | back/forward → `ArrowLeft` / `ArrowRight` · list/grid view → `LayoutList` / `LayoutGrid` · filter → `Filter` |
| Files | folder → `Folder` · document → `FileText` · downloads → `Download` · music → `Music` · pictures → `Image` · videos → `Video` |
| Edit actions | cut → `Scissors` · copy → `Copy` · paste → `ClipboardPaste` |
| Quick settings | brightness → `Sun` · volume → `Volume2` · airplane → `Plane` · bluetooth → `Bluetooth` · dark mode → `Contrast` · focus assist → `Moon` · battery saver → `Leaf` · screen snip → `Scissors` · read mode → `Eye` · hotspot → `Smartphone` · project → `Cast` |
| Top bar and system | weather → `Cloud` · wifi → `Wifi` · battery → `Battery` · notifications → `MessageSquare` (product uses `Bell`) · power → `Power` · start/launcher → `LayoutGrid` · recycle bin → `Trash2` |
| Window controls | `Maximize2` / `Minus` / `X` on hover |

## Amendments (product owner, Nov 2026)

- **Wallpaper** is the teal sky → warm horizon gradient from §2 (a minimal variant was tried and reverted);
  the top bar uses a slate tint (`--glass-dark: oklch(0.27 0.03 252 / 0.86)`) and is 72px tall.
- **Dock** floats in the top bar: magnifying icon tiles, names on hover, active item expands with its
  name. *Ask AI* is a white pill with the primary sparkle, the most prominent control on the right.
- **No mock/prototype badges** anywhere in the UI.
- **Application Studio** uses the scoped `.theme-studio` palette (indigo primary/accent, violet-grey
  canvas), a centred icon stepper, and keeps reasoning behind info icons and expanders.

## 10. Application Studio surface (product owner, Nov 2026)

Studio keeps the OS colour theme; only the layout language (glass, canvas, tiles) is its own. Scoped
to `.theme-studio`. **No black, dark violet or dark red fills:** they caused visual strain.

- **Canvas:** `--studio-wash`, a pale sky → mist → warm-horizon wash from the wallpaper's palette, with
  two slow-drifting blobs behind the glass. Its purpose is to give the glass something to refract.
- **Liquid glass (`liquid-glass`):** floating controls only — journey navigator, action dock, AI
  Architect, inspector, window actions. Text-heavy glass raises its opacity floor.
- **Cards (`studio-card`):** translucent white, radius 20–28px, soft blue-grey shadow.
- **Icon tile (`IconTile`):** soft `--accent` with blue glyph; solid `--primary` only for the Discover
  hero. Selected and current states are solid `--primary`.
- **Primary action (`ctaClass`):** the standard primary button, pill-shaped, once per screen.
- **Headline:** grey lead line plus a `--primary` line, only on Discover and the project list.
- **Actors:** person amber, AI blue, system teal (the `--tint-*` colours via `--actor-*`,
  `actor-meta.ts`), everywhere a step is drawn.
- **Text budget:** 1–2 lines per block. Prefer a tile, count, diagram or chip; put the rest behind
  `InfoTip` or an expander.
- **Motion:** states only — thinking links lighting up, the active level sliding, flow edges running
  once a step's resource is connected, the missing node pulsing. All off under reduced motion.

## 11. Desktop home (product owner, Nov 2026)

- **Domains** are glass folders previewing up to four app icons (`+n` beyond that). A folder expands in
  place from its own position (`ExpandedFolder`) while the rest of the screen blurs behind it.
- **Soft app icon (`AppIcon variant="soft"`, `AppTile`):** tinted border, very dim tinted fill, coloured
  duotone glyph. Used in folders; inside an open folder the icon and name share one container.
- **Platform tools** (Workflow Studio, System Explorer, Operations, Learning) sit in their own titled
  section after a clear gap, ungrouped.
- **`.widget-glass`:** the macOS-widget material for desktop tiles and widgets. Clearly translucent,
  specular rim and sheen; near-black text and a darker `--muted-foreground` keep it readable over the
  wallpaper, with solid fallbacks for reduced transparency.
- Three default widgets (Platform health, Approvals, Platform activity), no scrolling at normal sizes.
- **Wallpapers** (Settings → Desktop, or "+" → Change wallpaper): brand artwork only — Signature
  (default, blue), Midnight (navy network), Daylight (pale prisms) — plus Horizon (classic). Images in
  `public/wallpapers/`, generated by script, carry no text: the wordmark (Enterprise AI OS / BizOS) is
  drawn by `WallpaperBrand` in the lower-left safe area so it is never cropped, and is hidden where it
  would meet the home content. Each `[data-wallpaper]` block sets `--wallpaper`, `--wallpaper-ink`
  and `--glass-a1..3`.
- **Folders** open in place: the folder widens (spring), pushing the folders after it along; no
  overlay or blur. Esc, a press elsewhere or × closes it.
- **Dock:** fixed-size tiles (no magnification). A running app has a red bar under its tile (dimmer
  when minimized) and a soft ripple inside it. Hover shows a live preview of each window, labelled with
  what it holds (e.g. the draft name). Minimize and restore animate transform and opacity only (a
  curved scale into the tile and back) so they stay smooth; a window opens with a short spring and
  mounts its app after the first frame.
- **Soft icon fill** applies only to closed shapes, so open strokes (a chart's axis) never fill.

## 9. What the reference doesn't cover

- **Dark mode.** Not shown. The `.dark` block is invented.
- **Data-dense UI.** There are no tables, charts, forms, validation errors, empty states,
  loading/skeleton states, pagination, deltas or status chips. Those patterns above are
  inferred from the product, not extracted.
- **Typeface.** Estimated (Plus Jakarta Sans). The reference's actual font is not identifiable
  from pixels.
- **Glass parameters.** Blur radius, opacity and saturation are inferred from the colour
  shift, not measured. Treat 28px / 0.66 / 1.6 as a starting point.
- **Wallpaper asset.** None exists in the repo. `--wallpaper` is a gradient approximation of
  the sampled sky sweep. A real photo would look closer but adds weight and contrast risk.
- **Contrast.** Glass over photography varies. Text-dense glass must use `--glass-strong`, and
  every glass surface needs the reduced-transparency fallback.
- **Motion.** Not observable. Assume short (150–200ms) ease-out opacity/scale for windows and
  panels, and respect `prefers-reduced-motion`.

**Composition fidelity:** the reference composes a few large floating surfaces with generous
gaps over a calm wallpaper. Reproduce that density. Do not tile the desktop with many small
glass cards, and do not stack glass on glass more than one level deep. A glass panel holding a
white pane is the canonical pairing.
