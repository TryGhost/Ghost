declare module '@tryghost/kg-utils' {
    export function slugify (text: string, options?: {ghostVersion?: string, type?: string}): string;
}
