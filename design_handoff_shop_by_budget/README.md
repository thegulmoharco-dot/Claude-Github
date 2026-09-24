# Handoff: Homepage "Shop by Budget" Rail

## Overview
Homepage section letting customers browse by price tier instead of category: four square image tiles in a horizontally-scrollable rail, each linking to a pre-filtered collection view ("Under ₹999", "Under ₹1,999", etc).

## About the Design File
`shop-by-budget-reference.dc.html` is a **working HTML/React design reference**, not code to port directly. Recreate the visual/interaction spec below inside the theme's existing section architecture, wiring each tile to the corresponding Shopify collection/price filter.

## Fidelity
High-fidelity. Colors, typography, spacing, and interaction states below are final.

## Layout
- Section: `background:#F9F0E9`, vertical padding `104px`.
- Heading block (centered, max-width 1180px): "Shop by Budget." — Newsreader, weight 400, `clamp(28px,3.4vw,40px)`, line-height 1.12, letter-spacing -0.01em. Subcopy below: "Beautiful pieces, whatever you're looking to spend." — Manrope 300, 14px, `rgba(42,26,18,0.72)`.
- Rail: `display:flex; gap:48px`, horizontal scroll with `scroll-snap-type:x mandatory`, no visible scrollbar, `scroll-padding-left:44px`, max-width 1080px centered. Each tile `flex:0 0 max(200px, calc((100% - 144px)/4))` (4 visible on desktop, scrolls to reveal more / reflows narrower on smaller viewports).

## Tile Anatomy (top to bottom)
1. **Image** — 1:1 aspect ratio, `object-fit:cover`, background `#F7F1EA` while loading. Scales to `1.025` on hover/focus (700ms cubic-bezier(.2,.6,.2,1)) — subtle, no zoom-pop.
2. **Rule** — 1px line, `rgba(158,42,30,0.75)`, 24px wide at rest, expands to 44px on hover (600ms).
3. **Price label** — Newsreader 400, 18px: "Under" in 13px `rgba(42,26,18,0.62)` + the amount in `#9E2A1E`.
4. **Description** — Manrope 300, 12.5px, `rgba(42,26,18,0.72)`, max-width 24ch, min-height 40px (keeps tiles aligned even with 1–2 line copy).
5. **CTA** — "Shop Now →", Manrope 400, 10px, letter-spacing 0.24em, uppercase, `rgba(42,26,18,0.7)` → `#9E2A1E` on hover, with the label underlining and the arrow nudging 4px right on hover.

Whole tile is a single link (`aria-label` states the price tier for screen readers); focus state gets a 1px `#9E2A1E` outline with 10px offset (no default browser outline).

## Tier Data (current reference content)
| Tier | Description | Reference product shot |
|---|---|---|
| Under ₹999 | "Simple pieces for every day." | CZ Pavé Fan Pearl Stud Earrings (ER020) |
| Under ₹1,999 | "Delicate pieces with a little more presence." | Pearl Bow Stud Earrings (ER001) |
| Under ₹2,999 | "Distinctive pieces for everyday expression." | Emerald Eye Serpent Hoop Earrings (ER003) |
| Under ₹3,999 | "Statement pieces for giving and keeping." | Pearl Teardrop Necklace & Earrings Set (EPS002) |

Each tile links to the collection page filtered/sorted for that price ceiling — replace the placeholder link with the real collection-by-price URL per tier.

## Design Tokens
- Background: `#F9F0E9`
- Ink: `#2A1A12`
- Accent: `#9E2A1E`
- Fonts: Newsreader (serif — heading, price label), Manrope (sans — body copy, CTA)
- No border-radius, no shadows, no gradients.

## Accessibility / Motion
- Respects `prefers-reduced-motion`: disables the image scale, arrow nudge, and rule-width transitions.
- Rail is native scroll (keyboard/trackpad/touch all work) — no custom JS carousel needed.

## Files
- `shop-by-budget-reference.dc.html` — interactive reference.
