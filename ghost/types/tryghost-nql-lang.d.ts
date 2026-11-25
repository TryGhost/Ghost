// @tryghost/nql-lang ships no types, so this declares the surface Ghost's TypeScript uses.
// It types every `import` of the package in ghost; extend it when a caller needs more.
declare module '@tryghost/nql-lang' {
  /**
   * Parses NQL filter text into the Mongo-style query object it describes, exactly as written:
   * unlike `@tryghost/nql`, it doesn't merge or rewrite any condition. Throws when the text doesn't
   * parse, which includes text that isn't a filter.
   */
  export function parse(filter: string): Record<string, unknown>;
}
