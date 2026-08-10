// Interim, automations-scoped override for dark-mode error styling.
//
// Shade's shared `--destructive` token is red-500 in BOTH light and dark, so error text/borders read
// as dark and over-saturated on dark surfaces (poor contrast). We deliberately do NOT brighten the
// token globally: it's also the SOLID destructive-button fill, where a brighter red (red-400 already)
// reads as coral — and a proper dark-mode red ramp is a design-system-wide change (slated for the
// ~2027 refresh).
//
// So, scoped to the automations UI only, we route error FOREGROUND + BORDERS through
// `--automation-danger` (defined in apps/admin/src/index.css): red-500 in light, red-400 in dark. It's
// a flip-on-.dark token — like every other Shade semantic colour — NOT a `dark:` utility variant,
// because the dark variant is gated by `:not(.light *)` and silently breaks inside the force-light
// subtree the automation canvas renders in. red-400 (not red-300): red-300 reads as pink rather than
// error. When the system-wide dark-mode red lands, delete this file + the token and revert call sites
// to plain `text-destructive` / `border-destructive`.
//
// One knob: change the `.dark` value of `--automation-danger` in index.css to retune every surface.

// Error foreground — icons and text.
export const dangerText = 'text-automation-danger';

// Solid error border — validation errors.
export const dangerBorder = 'border-automation-danger';

// Softer error border with hover emphasis — Mailgun-not-connected email steps.
export const dangerBorderSubtle = 'border-automation-danger/70 hover:border-automation-danger';
