# Tailwind v3 → v4 Migration TODO

A step‑by‑step checklist to migrate this repo from TailwindCSS v3 (JS config) to v4 (CSS‑based `@theme`), preserving Shade scoping, dark mode variant, tokens, and animations.

## 1) Inventory current config and usage
- [x] Review `tailwind.config.cjs` for tokens and behaviors to port (screens, colors incl. gray/grey/ghostaccent, spacing, fonts, radii, shadows, animations, darkMode variant, preflight=false, important scoping, plugins)
- [x] Find usages that require exact retention:
  - [x] Colors and legacy aliases: `rg "text-grey|bg-grey|border-grey|from-grey|to-grey|via-grey|gray-925|grey-925|ghostaccent" src`
  - [x] Animations: `rg "animate-" src`
  - [x] Fonts: `rg "font-(inter|cardo|manrope|merriweather|nunito|tenor|prata|roboto|rufina|space|chakra|noto|poppins|fira|jetbrains)" src`

## 2) Add @theme tokens in CSS
Edit `styles.css` (or create `src/styles/theme.css` and import from `styles.css`) and add a single `@theme { ... }` block covering the following. Map values 1:1 from `tailwind.config.cjs`.

- Breakpoints (from `theme.screens` → `--breakpoint-*`)
  - [x] `--breakpoint-sm: 480px`
  - [x] `--breakpoint-md: 640px`
  - [x] `--breakpoint-sidebar: 800px`
  - [x] `--breakpoint-lg: 1024px`
  - [x] `--breakpoint-sidebarlg: 1240px`
  - [x] `--breakpoint-xl: 1320px`
  - [x] `--breakpoint-xxl: 1440px`
  - [x] `--breakpoint-xxxl: 1600px`
  - [x] `--breakpoint-tablet: 860px`

- Colors (from `theme.colors`)
  - Base
    - [x] `--color-transparent: transparent`
    - [x] `--color-current: currentColor`
    - [x] `--color-ghostaccent: var(--accent-color, #ff0095)`
    - [x] `--color-white: #FFF`
    - [x] `--color-black: #15171A`
  - Gray palette (official; keep names for `text-gray-*`)
    - [x] `--color-gray-50..975` and `--color-gray-DEFAULT: #ABB4BE`
  - Legacy grey palette (to preserve `text-grey-*` usage)
    - [x] `--color-grey-50..975` and `--color-grey-DEFAULT: #ABB4BE`
  - Brand palettes (each with 100/400/500/600 and `DEFAULT`)
    - [x] green
    - [x] blue
    - [x] purple
    - [x] pink
    - [x] red
    - [x] orange
    - [x] yellow
    - [x] lime (`DEFAULT: #B5FF18`)
  - Semantic HSL tokens (already present in `styles.css` under `:root`/`.dark`); leave as-is and ensure class utilities keep using them:
    - [x] `background`, `foreground`, `card.*`, `popover.*`, `primary.*`, `secondary.*`, `muted.*`, `accent.*`, `destructive.*`, `border`, `input`, `ring`, `chart.*`, `sidebar.*`

- Typography
  - Font families (map v3 names so `font-<name>` keep working)
    - [x] `--font-sans`, `--font-serif`, `--font-mono`, plus aliases used: `--font-inter`, `--font-cardo`, `--font-manrope`, `--font-merriweather`, `--font-nunito`, `--font-tenor-sans`, `--font-old-standard-tt`, `--font-prata`, `--font-roboto`, `--font-rufina`, `--font-space-grotesk`, `--font-chakra-petch`, `--font-noto-sans`, `--font-poppins`, `--font-fira-sans`, `--font-noto-serif`, `--font-lora`, `--font-ibm-plex-serif`, `--font-space-mono`, `--font-fira-mono`, `--font-jetbrains-mono`
  - Letter spacing
    - [x] `--tracking-tightest`, `--tracking-tighter`, `--tracking-tight`, `--tracking-normal`, `--tracking-wide`, `--tracking-wider`, `--tracking-widest`
  - Font sizes (and tuple line-heights where applicable)
    - [x] `--font-size-2xs..9xl` with matching `--line-height-*` where v3 used arrays (e.g., 5xl/6xl/7xl/8xl/9xl)
  - Line heights
    - [x] `--line-height-base`, `--line-height-tight`, `--line-height-tighter`, `--line-height-supertight`

- Sizing & layout
  - Spacing scale
    - [x] `--spacing-0,1,2,...,96,px,0.5,1.5,2.5,3.5` (use rem values from v3)
  - Border radius
    - [x] `--radius` (base), plus `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-full`
  - Shadows
    - [x] `--shadow`, `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-md-heavy`, `--shadow-lg`, `--shadow-xl`, `--shadow-inner`, `--shadow-none`
  - Max widths
    - [x] `--container-xs..9xl`, plus customs: `--container-page`, `--container-pageminsidebar`

## 3) Migrate animations
- [x] Convert all keyframes from `tailwind.config.cjs` to plain CSS `@keyframes` in `styles.css`:
  - [x] `toasterIn`, `toasterTopIn`, `toasterOut`, `fadeIn`, `fadeOut`, `modalIn`, `modalInFromRight`, `modalInReverse`, `spin`, `accordion-down`, `accordion-up`
- [x] Declare animation tokens in `@theme` so `animate-*` utilities are preserved:
  - [x] `--animate-toaster-in: toasterIn 0.8s cubic-bezier(0.445,0.050,0.550,0.950)`
  - [x] `--animate-toaster-out: toasterOut 0.4s 0s 1 ease forwards`
  - [x] `--animate-toaster-top-in: toasterTopIn 0.8s cubic-bezier(0.445,0.050,0.550,0.950)`
  - [x] `--animate-fade-in: fadeIn 0.15s ease forwards`
  - [x] `--animate-fade-out: fadeOut 0.15s ease forwards`
  - [x] `--animate-setting-highlight-fade-out: fadeOut 0.2s 1.4s ease forwards`
  - [x] `--animate-modal-backdrop-in: fadeIn 0.15s ease forwards`
  - [x] `--animate-modal-in: modalIn 0.25s ease forwards`
  - [x] `--animate-modal-in-from-right: modalInFromRight 0.25s ease forwards`
  - [x] `--animate-modal-in-reverse: modalInReverse 0.25s ease forwards`
  - [x] `--animate-spin: spin 1s linear infinite`
  - [x] `--animate-accordion-down: accordion-down 0.2s ease-out`
  - [x] `--animate-accordion-up: accordion-up 0.2s ease-out`

## 4) Dark mode variant
- [x] Add a Tailwind CSS custom variant to match v3 behavior:
  - [x] In `styles.css`, near the top: `@custom-variant dark (&:is(.dark *):not(.light *));`
- [x] Keep existing `.dark` variable overrides (already defined in `styles.css`)

## 5) Plugins and preflight
- [x] Disable Tailwind preflight via inline config: add to `styles.css`: `@config { preflight: false; }`
- [x] Keep our reset: ensure `@import './preflight.css' layer(base);` stays at the top
- [x] Register animate plugin in CSS: add to `styles.css`: `@plugin "tailwindcss-animate";`

## 6) Scope utilities to `.shade`
- [x] Retain scoping via a minimal `tailwind.config.cjs` containing only `important: '.shade'`
- [x] Remove other sections from the JS config (theme, extend, plugins, content) once the build verifies that CSS tokens are honored
- [x] Keep `tailwind.cjs` only if something else still imports it; otherwise plan to remove it after verification

## 7) Update styles.css and remove external config reference
- [x] In `styles.css`, remove `@config './tailwind.config.cjs'` (the inline `@config { ... }` replaces it)
- [x] Ensure the order is: preflight import → `@plugin` → inline `@config` → `@theme` → `@custom-variant` → existing base/utilities

## 8) Verification
- Build & lint
  - [ ] `yarn lint`
  - [ ] `yarn test`
  - [x] `yarn build`
- Storybook visual pass
  - [ ] `yarn storybook` and compare before/after (spacing scale, `gray-925` and `grey-*` colors, animations, radii, shadows)
- Targeted searches
  - [x] Colors: `rg "text-grey-|bg-grey-|border-grey-|gray-925|grey-925|ghostaccent" src` (all should render correctly)
  - [x] Animations: `rg "animate-" src` (each name defined in `@theme`)
  - [x] Fonts: any `font-<name>` used should map to a defined `--font-*` or to `--font-sans/serif/mono`
- Defaults compatibility
  - [x] Confirm the base rule in `styles.css` that restores v3’s border color default still exists

- [x] Update `README.md` to note:
  - Theme tokens live in CSS `@theme`; only `important: '.shade'` remains in JS config
  - How to add new tokens (`--color-*`, `--spacing-*`, etc.), variants (`@custom-variant`), and plugins (`@plugin`)
- [x] Optionally update `AGENTS.md` with quick guidelines for adding tokens/variants
- [ ] After successful rollout, consider removing `tailwind.config.cjs` only if a robust scoping alternative to `important: '.shade'` is adopted

## 10) Optional future work (not required for migration)
- [ ] Explore removing JS config entirely by introducing a build‑time scope under `:where(.shade)` or by refactoring to a `shade:` variant (invasive; defer)
- [ ] Consolidate theme tokens into a dedicated `src/styles/theme.css` if desired for clarity

---

Tips
- Keep changes minimal and focused; don’t rename tokens or alter scales during migration.
- Validate critical components in Storybook (buttons, inputs, sidebar, modals, toasts).
- If any utility stops working, check that its corresponding `--*` token exists in `@theme` and that naming matches Tailwind v4 conventions.
