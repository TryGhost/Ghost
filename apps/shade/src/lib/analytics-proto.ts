// ANALYTICS PROTOTYPE: shared classes for the prototype's analytics style.
// The `analytics-proto:` variant (tailwind.theme.css) applies them only while
// the shaping menu sets `data-analytics-proto` on <html> (every view but
// Today). Style only. Separate from main's real admin7Design switch, which
// stays on so the rest of Admin shows the Admin 7 look.

// Metric labels: small caps mono, without a leading icon
export const analyticsProtoLabel =
  'analytics-proto:font-mono analytics-proto:text-sm analytics-proto:font-normal analytics-proto:tracking-wide analytics-proto:uppercase analytics-proto:[&_svg]:hidden';
