# Devices — spatial contract

How Calm Writer fits **any** browser width and height. Visual language stays in `FDesign.md`. This file is the only layout law.

A screen is valid if it works at **320×480** and at **1440×900**. Everything in between is then free.

## Rules

1. **Never invent a page layout.** Use a shell (below). Do not start a screen with `style={{ minHeight: '100vh', padding: 20, maxWidth: 800 }}`.
2. **Width is fluid.** The *column* has a max-width. The *page* is always `100%`. Never give a page or shell a fixed pixel width.
3. **Height is the visual viewport.** Pages: `min-height: var(--vh)`. Overlays: `max-height` of the visual viewport, **scroll inside**. Do not lock the whole app to `height: 100vh; overflow: hidden` unless every pane inside is its own scroll region.
4. **Breakpoints change structure, not decoration.** Compact = one column. Regular+ may add a side column. Do not add a breakpoint just to tweak padding.
5. **Inline styles are not for layout.** No `width`, `height`, `display`, `position`, `overflow`, or `maxWidth` in `style={{}}` except true one-offs (chart series, a measured progress bar). Layout lives in CSS so it can respond.
6. **Every overlay fits.** Margin to the viewport edge ≥ `--page-pad` + safe-area. If content is taller than the viewport, the overlay **body** scrolls.
7. **Touch and type.** Compact tap targets ≥ `--tap` (44px). Form text ≥ 16px (stops iOS focus-zoom). Hover is enhancement; every action works with a tap.
8. **Overflow without an intentional scroll region is a bug.** Horizontal page scroll is never acceptable. Drag the window from 320×480 up to desktop before merging.

## Shells

| Class | Use |
| --- | --- |
| `.app-shell` | Root in `App.jsx`. `min-height: var(--vh)`. Never `100vw`. |
| `.page-shell` | Almost every route. Safe-area padding. Inner `.page-shell__inner` is the only max-width. |
| `.split-shell` | Feed (main + aside). Row on regular+; aside stacks below on compact. Aside is `sticky`, never `fixed` + `100vw` math. |
| `.overlay-shell` | Dialogs, auth card, report/edit/action modals. Centered in the visual viewport. Inner body scrolls. |

Column modifiers on `.page-shell__inner`:

- `--narrow` → `--col-narrow` (680)
- `--story` → `--col-story` (720)
- `--page` → `--col-page` (800) — default
- `--wide` → `--col-wide` (1240)

Toasts use `.toast-stack` (safe-area already applied). Do not invent a second toast position.

## Breakpoints

Defined as tokens, used only in CSS:

| Name | Query | Structure |
| --- | --- | --- |
| compact | `max-width: 720px` | One column. 44px taps. Secondary nav in the overflow menu. Overlays nearly full-bleed. |
| regular | `max-width: 1024px` | Stack `.split-shell` aside. No `position: fixed` sidebars. |
| wide | default | Two-column feed, sticky aside. |
| short | `max-height: 540px` | Shrink overlay chrome. Keep the composer/input visible. No fixed `500px` / `70vh` panes. |

## Tokens

`--page-pad` · `--tap` · `--col-narrow/story/page/wide` · `--safe-top/right/bottom/left` · `--vh` (`100dvh`, falls back to `100vh`) · `--bp-compact` / `--bp-regular`

Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`. Never disable user scaling.

## New screen checklist

- [ ] Uses a **shell**. No new `100vh` or fixed-width page.
- [ ] Overlay uses `.overlay-shell`.
- [ ] Compact tap ≥ `--tap`. Inputs ≥ 16px.
- [ ] Rechecked at 320×480 and 1440×900. No horizontal scroll.
- [ ] Short height: keyboard does not trap the primary field off-screen.
