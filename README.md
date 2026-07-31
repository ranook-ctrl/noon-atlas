# noon Atlas

> An interactive, infinite-canvas map of the noon app — every key screen and the flows that connect them, laid out on a single pannable, zoomable plane.

**🔗 Live:** [noon-atlas.vercel.app](https://noon-atlas.vercel.app/)

noon Atlas turns a static flow diagram into a living map. Instead of scrolling through a deck of disconnected mockups, you explore the whole product as one spatial canvas: pan across the plane, zoom into any screen, tap to focus, and follow the connectors that trace how a user travels from the Homepage out to Categories, Electronics, TVs, Search, Gift cards and beyond. A floating chrome layer — inspector, breadcrumbs, stats and sidenav — stays pinned above the canvas so context travels with you as you move.

The layout, spacing, typography and flows are authored 1:1 with the source Figma designs, so the Atlas is a faithful, interactive mirror of the design file rather than an approximation.

---

## Capabilities

### 🗺️ Infinite canvas
- **Pannable, zoomable plane** with an adaptive cross-grid that keeps a consistent visual pitch at any zoom level (scale range 0.1×–4×).
- **Natural gestures** — trackpad two-finger scroll to pan, ⌘/Ctrl + scroll or pinch to zoom toward the cursor, and click-drag on the background to pan.
- **Smooth, eased camera animations** when focusing a screen; any manual interaction instantly cancels an in-flight animation.

### 🖼️ Screen artboards & flows
- **17 app screens** rendered as artboards at their exact design-world coordinates.
- **18 flow connectors** drawn as SVG inside the world layer, so they pan, zoom and stretch with everything else. Each arrow leaves and arrives perpendicular to a board edge, curving between, with a source dot and a destination arrowhead.
- **Draggable boards** — move any artboard and its connectors re-shape live to follow.
- **Tap to focus** — tapping a board promotes it to the focused variant and pans/zooms the camera so it sits centered in the viewport.

### 🔍 Inspector (Right Nav)
- A **sliding side panel** that previews the focused screen — the Homepage shows its full scrollable mockup; every other screen shows its own artboard.
- **Rolling stat reels** that animate to the focused screen's metrics as the focus changes.
- Opens automatically when a board is focused and slides away on close.

### 🧭 Breadcrumb flow trail
- A live **breadcrumb path** computed from the Homepage hub to the currently focused screen — first crumb is the source, last is the current screen, with the intermediaries in between.
- Each crumb is clickable to jump focus along the flow.

### 📊 Per-section stats
- Hovering a Homepage section surfaces a **contextual stats card** for that block, linked to the section by a connector line that tracks the geometry across the canvas.

### 🎛️ App chrome
- **Morphing sidenav** — the "noon Homepage" pill expands into a full sidebar and collapses back.
- **Map / Screens switch**, top navigation with live screen & path counts, and a **reset control** that re-centers on the Homepage and restores any dragged boards to their original positions.
- **Responsive UI scaling** — the chrome is authored against a reference viewport and uniformly scaled (`--ui-scale`) so every widget, text size and inset stays proportional on any device, while the canvas below fills the viewport at true scale with its own zoom.

### 🧩 Component gallery
- A dedicated view at [`?view=gallery`](https://noon-atlas.vercel.app/?view=gallery) showcasing the underlying atoms and molecules (pills, rows, breadcrumbs, stat bars, device sizes, nav, sidebar, master image and more) with their Figma node references.

---

## Tech stack

| | |
|---|---|
| **Framework** | [React 19](https://react.dev/) |
| **Build tool** | [Vite 6](https://vite.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + custom CSS, GeistPixel display font |
| **Language** | TypeScript 5 |
| **Dev tooling** | [retune](https://www.npmjs.com/package/retune) visual-edit overlay (dev only — toggle with ⌥/Alt + D) |
| **Hosting** | [Vercel](https://vercel.com/) |

---

## Getting started

```bash
# install
npm install

# run the dev server (http://localhost:6100)
npm run dev

# type-check + production build
npm run build

# preview the production build locally
npm run preview
```

---

## Project structure

```
src/
├── App.tsx            # entry — routes ?view=gallery vs. the Dashboard
├── pages/
│   ├── Dashboard.tsx  # the main Atlas landing page (canvas + chrome)
│   └── Gallery.tsx    # component gallery
├── canvas/            # infinite plane: viewport, grid, artboards & flow links
├── molecules/         # composed widgets — TopNav, Sidebar, RightNav, StatsBar…
└── components/        # atoms — Pill, Row, Breadcrumb, RollingNumber, MaskIcon…
public/
├── images/screens/    # per-screen artboard screenshots
├── icons/             # UI icons
└── fonts/             # GeistPixel
```

### Views

| URL | View |
|---|---|
| `/` | The Atlas dashboard — infinite canvas of screens and flows |
| `/?view=gallery` | The atoms / molecules component gallery |

---

## Deployment

The app is a static SPA deployed on Vercel. Configuration lives in [`vercel.json`](./vercel.json):
the Vite framework preset builds with `vite build` into `dist/`, and a rewrite serves `index.html`
for every path (view switching is driven by the `?view=` query param). The `retune` dev overlay is
lazy-loaded only in development, so it's excluded from the production bundle.

```bash
# deploy to production
vercel deploy --prod
```
