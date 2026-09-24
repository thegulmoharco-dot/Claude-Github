# Handoff: Homepage "Best Sellers" 3D Coverflow

## Overview
Replaces the current generic homepage collection section with an editorial 3D coverflow presentation of Shopify Best Seller products: dominant center product card, two receded side cards, arrow + swipe navigation, quiet dot pagination. Uses the EXISTING TGC product card unchanged — this is a spatial presentation layer around that card, not a new card design.

## About the Design File
`best-sellers-reference.dc.html` is a **working HTML/React design reference**, not code to port directly. Recreate the visual/interaction spec below inside the theme's existing section + product-card architecture.

## Fidelity
High-fidelity. Every value below (spacing, scale, opacity, z-index, transition curve) is final and must be matched — this is a fix/rebuild of a previous implementation that diverged badly from spec (see "Known Implementation Bugs" below).

## Known Implementation Bugs — Please Fix
The last build shipped to the live site with these specific defects. Fix these first:

1. **Cards overlapping with zero gap.** Adjacent cards' text (title/price) render underneath the neighboring card instead of receded/offset. Root cause is almost certainly missing/incorrect `translateX` per card position. Center-to-center horizontal distance between cards **must be 300px on desktop** (with card width 270px) — that leaves real visual separation. Do not let card bounding boxes' text rows intersect at rest.
2. **Badges detached/floating instead of pinned to their own card.** The material badge and the bag/add-to-cart icon are rendering as if `position:absolute` relative to the wrong ancestor (viewport or grid, not the card's own image container). Each badge must be `position:absolute` **inside that card's own image wrapper** (`position:relative`), so it moves and scales together with its card, not independently.
3. **"Quick View" trigger overlapping price text.** This is a separate existing feature (see `design_handoff_quick_view`) that's colliding with this section's price row. The two features must not be composed on the same row without spacing — if Quick View is present on these cards, it goes in its own row below price with normal card spacing rules, not stacked on top of it.
4. **No depth hierarchy visible** — all cards render at the same size/opacity. Confirm the scale/opacity/rotation transform (below) is actually applied per card based on its offset from center, not a static style.

## Desktop Composition
`[ SIDE ]   [ CENTER ]   [ SIDE ]`

- Stage: `max-width: 960px`, `height: 440px`, centered, `perspective: 1500px`, `overflow: hidden`.
- Card width: **270px** (existing TGC product card, unchanged internals).
- Card horizontal position: `translateX(offset * 300px)` where offset is -1 (left), 0 (center), 1 (right). Cards beyond ±1 are hidden (`opacity:0`, `pointer-events:none`) but still exist in the DOM for smooth wrap-around.
- Center card: `scale(1) rotateY(0deg) translateZ(0)`, `opacity:1`, `z-index:3`.
- Side cards: `scale(0.9) rotateY(∓6deg) translateZ(-60px)`, `opacity:0.53`, `z-index:2`. (Rotation sign flips per side — left card rotates positive, right card negative, i.e. both tilt "away" from center.)
- Transition: `transform 900ms cubic-bezier(0.22,0.61,0.36,1)`, `opacity` same timing/curve. No bounce, no overshoot.
- Card click on a side card navigates to it (does not open PDP); clicking the center card's image follows the normal PDP link.

## Desktop Navigation
- Arrows: thin line + chevron mark (not a circle/button), ~42×12px visual, `stroke-width:1.1`, color `rgba(42,26,18,0.42)` → `#9E2A1E` on hover, plus a 4px horizontal nudge toward the direction on hover (200ms). Hit area 44px tall via padding, no visible box/border/shadow.
- Arrows sit outside the stage (20px gap), vertically aligned to the **product photo's center** (not the whole card's center — photo is the top 270×337.5px of the card; arrow should align there, roughly 147px down from the stage top, not centered on the full ~440px card+text height).
- Arrow click and swipe both trigger the identical transition system (see Motion below) — same duration/easing, no separate animation language.
- One click/swipe = one step. Ignore additional nav input until the in-flight transition completes (~900ms lock) to prevent overlapping/glitched states.

## Mobile Composition (390px reference viewport)
`[ tiny clipped edge ]   [ CENTER ]   [ tiny clipped edge ]`

- Card width: **310px** (~86vw at 360vw baseline). Stage `max-width: 342px`, `height: 460px`, `overflow:hidden`.
- At rest, side cards sit **fully outside the clipped stage** (translateX ±400px with scale 0.92 — their visible edge is well past the stage boundary), so **no neighboring title/price/button is visible at rest.** Only the center card reads.
- Side-card transform when passing through during a swipe: `scale(0.92) rotateY(∓3.6deg) translateZ(-30px)`, `opacity:0.45–0.65` (same opacity formula as desktop, scaled).
- No visible "swipe" hint text — the interaction should be self-evident from the pagination dots + subtle arrows.
- Arrows: same line+chevron mark, smaller (16×6px visual), positioned in the section's own side padding (`left/right: -16px` relative to the stage row, i.e. in the ivory gutter, never overlapping the card), vertically aligned to the photo center (~194px from stage top, translateY(-50%)).
- Touch: horizontal swipe (~50px threshold) navigates via the same transition system as arrows; `touch-action: pan-y` on the stage so **vertical page scroll is never blocked**.

## Product Card (unchanged — reference only)
Do not redesign. Each card keeps: material badge (top-left, `rgba(246,236,213,0.92)` chip), product image (cover-fit), image-gallery dots (bottom-center, 4px, active burgundy), category eyebrow (JetBrains Mono, uppercase, burgundy), Newsreader product title, Manrope price in burgundy, and a small circular bag+icon chip (bottom-right of the photo, 34px, same ivory chip treatment as the badge, thin bag+plus glyph, `rgba(42,26,18,0.65)` → burgundy on hover) replacing any large "Add to Bag" button.

## Carousel Pagination (below the stage, above CTA)
- Small dots, one per product, 6px inactive / 7px active, gap 9px, centered.
- Active: `#9E2A1E`. Inactive: `rgba(42,26,18,0.28)`.
- Not numeric, not large. Separate from each card's own image-gallery dots.

## Section Hierarchy
"— BEST SELLERS —" eyebrow → "Best Sellers" (Newsreader, ~40px desktop / 30px mobile) → italic Newsreader subcopy → carousel → pagination dots → "VIEW ALL JEWELLERY →" (plain uppercase Manrope, thin burgundy underline, no pill).

## Design Tokens
- Background: `#F9F0E9` (section), `#EDDFBE` (page)
- Ink: `#2A1A12`
- Accent: `#9E2A1E`
- Fonts: Newsreader (serif — headings, product titles, italic subcopy), Manrope (sans — labels, price, buttons), JetBrains Mono (uppercase eyebrows/labels)
- No border-radius beyond the small circular chips; no shadows, no gradients, no blur anywhere in this section.

## Files
- `best-sellers-reference.dc.html` — interactive reference (includes a Desktop/Mobile toggle demo bar at the top — review aid only, not part of the live section).
