/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GHOST_BUILD_VERSION?: string;
  readonly VITE_CANVAS_NATIVE_WEBMCP?: string;
  readonly VITE_CANVAS_RELAY_URL?: string;
}

declare module '@tryghost/nql' {
  export default function nql(query: string): { queryJSON: (data: unknown) => boolean };
}
declare module '@tryghost/string' {
  export function slugify(string: string, options?: { requiredChangesOnly?: boolean }): string;
}
declare module '@tryghost/koenig-lexical';
