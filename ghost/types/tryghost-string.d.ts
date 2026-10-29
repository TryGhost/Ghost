// @tryghost/string ships no types, so this declares the surface Ghost's TypeScript uses. It
// types every `import` of the package in ghost; extend it when a caller needs more.
declare module '@tryghost/string' {
  /** The text as a URL slug. `requiredChangesOnly` skips optional cleanup, such as extra dashes. */
  export function slugify(input: string, options?: { requiredChangesOnly?: boolean }): string;

  /** The text without zero-width and other invisible characters. */
  export function stripInvisibleChars(input: string): string;
}
