declare module '@tryghost/string' {
  export function slugify(string: string, options?: { requiredChangesOnly?: boolean }): string;
}
