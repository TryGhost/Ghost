// @tryghost/helpers ships no types. Declare the surface ghost/core actually uses.
declare module '@tryghost/helpers' {
  export const utils: {
    readingMinutes: (html: string, additionalImages?: number) => number;
  };

  export function readingTime(...args: unknown[]): unknown;
  export function tags(...args: unknown[]): unknown;
}
