// @tryghost/mongo-utils ships no types, so this declares the surface Ghost's TypeScript uses.
// It types every `import` of the package in ghost; extend it when a caller needs more.
declare module '@tryghost/mongo-utils' {
  /** A Mongo-style query object, the form NQL parses a filter into. */
  type Query = Record<string, unknown>;

  /** Rewrites a parsed filter, as NQL's `mongoTransformer` option takes it. */
  type Transformer = (filter: unknown) => unknown;

  /** A key that stands for another, with a condition each statement on it is grouped with. */
  interface Expansion {
    key: string;
    replacement: string;
    expansion?: Readonly<Query>;
  }

  /** A transformer that applies each of `transformers` in turn. */
  export function chainTransformers(...transformers: Transformer[]): Transformer;

  /** One transformer for each key in `keys`, each renaming that key to the key it maps to. */
  export function mapKeys(keys: Readonly<Record<string, string>>): Transformer[];

  /** `statements` with each statement on a key of `replacements` replaced by that key's filter. */
  export function replaceFilters(
    statements: unknown,
    replacements: Readonly<Record<string, unknown>>,
  ): unknown;

  /** `statements` without the statements whose key `reject` accepts. */
  export function rejectStatements(statements: unknown, reject: (key: string) => boolean): unknown;

  /** The keys `filter` uses, in the order they first appear, including those inside groups. */
  export function getUsedKeys(filter: unknown): string[];

  /** Whether `statements`, or a filter inside them, has a key or operator named `match`. */
  export function findStatement(statements: unknown, match: string): boolean;

  /**
   * One filter from `filters`, in order of priority: a statement on a key an earlier filter names
   * is left out. Empty groups are dropped. Always returns a new object.
   */
  export function mergeFilters(...filters: readonly (Readonly<Query> | undefined)[]): Query;

  /**
   * `statements` with each statement on an expansion's key renamed to its replacement, grouped
   * with the expansion's condition when it has one. The first expansion of a key applies.
   */
  export function expandFilters(
    statements: Readonly<Query>,
    expansions: readonly Readonly<Expansion>[],
  ): Query;
}
