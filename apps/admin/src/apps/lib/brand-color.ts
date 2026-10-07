// Apps that don't declare a colour share this one: Ghost green.
const DEFAULT_BRAND_COLOR = '#548970';

/** The colour an app is shown in: its manifest's, or the shared default. */
export function appBrandColor(color?: string): string {
  return color ?? DEFAULT_BRAND_COLOR;
}
