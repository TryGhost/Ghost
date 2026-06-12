declare module '@tryghost/string' {
    export function slugify(str: string, options?: {requiredChangesOnly?: boolean}): string;
}
