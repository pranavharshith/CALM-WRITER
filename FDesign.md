# FDesign — Calm Writer design language

Living spec for UI, motion, loading, and feedback. Future features follow this file.
Tokens live in `frontend/src/index.css` — do not duplicate values here.

## 1. Philosophy

Liquid Glass over an ambient color-field. Surfaces are frosted, translucent, and
soft; they sit above sage / navy / amber blobs, never on a flat slab.

Calm, editorial, unhurried. Playfair Display for storytelling (titles, reader,
writer). Inter for UI chrome. No harsh motion, no layout jumps, no native
`alert()` / `confirm()`.

## 2. Tokens

Single source of truth: `:root` and `[data-theme]` in `frontend/src/index.css`.

Use these families only — never hard-code hex in components:

- Color: `--bg-*`, `--text-*`, `--accent*`, `--sage*`, `--rose*`, `--amber*`, `--blue-*`, `--border*`
- Glass: `--glass-bg`, `--glass-bg-strong`, `--glass-bg-hover`, `--glass-border*`, `--glass-blur`, `--glass-shadow`, `--glass-inset`, `--overlay-scrim`
- Shadow: `--shadow-xs` / `--shadow-sm` / `--shadow-md`
- Radius: `--radius-sm` (8) / `--radius-md` (14) / `--radius-lg` (20) / `--radius-pill` / `--radius-full`
- Space: `--sp-1` … `--sp-12`
- Type: `--font-serif`, `--font-sans`, `--fs-*`, `--lh-*`
- Motion: `--transition`, `--transition-spring`

## 3. Motion language

| Intent | Token / duration |
| --- | --- |
| State changes (hover, toggle, color) | `--transition` · 0.22s ease |
| Entrances / celebrations | `--transition-spring` · 0.3s spring |
| Enter | ≤ 220ms |
| Exit | ≤ 180ms |
| Toast life | 3.5s |
| New-card highlight | 2.2s |
| Card stagger | 40ms apart, **max 6** items |

`prefers-reduced-motion` is already global in `index.css` and collapses every
animation / transition. Do not add local motion without inheriting that rule.

Modifiers: `--loading`, `--new`, `--entering`.

## 4. Loading taxonomy (the core rule)

Pick **one tier per region**. Never mix.

### T0 · Route mount

Full-page `Skeleton<Page>`. Minimum **650ms** via `useMinLoadTime`.
Allowed **only** when a route mounts with no data.

### T1 · Region refresh

The page stays mounted. Only the changed region shows `Skeleton<Region>`
(≥ **250ms** via `useRegionLoading`), with a stable `min-height` and
`aria-busy`. Sorting, search, filter, tab.

### T2 · Pagination

Append `SkeletonFeedPagination` (or a tiny row stub) **below** existing
content. Never replace what is already on screen.

### T3 · Mutation (create / edit / delete)

**Never a skeleton.** Optimistic UI + button loading ring + success toast.
Backend reconciliation is silent.

### The Region Contract

1. A region owns its loading.
2. A parent may **never** unmount to indicate a child is loading.
3. Regions reserve `min-height` to prevent CLS.
4. Use `SkeletonRegion` as the crossfade wrapper.

## 5. Feedback language

- **Toasts** — glass, bottom-right stack, spring slide-in, `aria-live="polite"`.
  Types: `success` / `error` / `info`. 3.5s, dismissible.
  API: `useToast()` → `toast.success()`, `toast.error()`, `toast.info()`.
- **Button loading** — `.btn--loading` + `.spinner-ring` + label swap
  (`Publish` → `Publishing…`).
- **Destructive** — `ConfirmDialog` (glass). Never native `confirm()`.
- **Inline errors** — existing rose-light banner (`.feed__error`,
  `.write-screen__error`, `.alert--error`). Stay in-page.

## 6. Skeleton anatomy

- Shimmer: 1.6s (`@keyframes shimmer` / `.skeleton-shimmer`)
- Radius: `--radius-md` (cards), `--radius-sm` (lines)
- Surface: glass (`--glass-bg-strong` + `--glass-border`)
- Dimensions mirror the real component 1:1. If the real card is 24px padded
  with a 32px avatar, the skeleton is too.

Naming: `Skeleton<Region>` — `SkeletonFeedCards`, `SkeletonHubDetail`,
`SkeletonEditRequestRow`, `SkeletonWidgetLine`, `SkeletonFeedPagination`.

## 7. Naming & structure

| Kind | Pattern |
| --- | --- |
| Skeletons | `Skeleton<Region>` in `SkeletonLoader.jsx` |
| Hooks | `useMinLoadTime` (T0, default 650ms), `useRegionLoading` (T1, default 250ms) |
| CSS modifiers | `--loading`, `--new`, `--entering` |
| New cards | `.story-card--new`, `.thread-card--new` (sage glow, 2.2s, auto-clear) |

## 8. Adding a new feature — checklist

- [ ] Pick a loading **tier per region** (T0 only on first route mount).
- [ ] Add a 1:1 `Skeleton<Region>` if T0 / T1 / T2.
- [ ] Mutation → optimistic update + loading ring + toast. No skeleton.
- [ ] Destructive path → `ConfirmDialog`.
- [ ] `aria-busy` on loading regions; toasts `aria-live="polite"`.
- [ ] Region reserves `min-height`. Parent never unmounts for a child load.
- [ ] Check `prefers-reduced-motion` (global — don't fight it).
- [ ] Tokens only; no new hex, no `alert()`, no native `confirm()`.
