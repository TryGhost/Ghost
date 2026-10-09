import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    failModuleLoads: (pathEnd: string) => Promise<void>;
    resetFailedModuleLoads: () => Promise<void>;
  }
}

// Kept for the whole spec file, as the browser keeps a failed import failed.
const failedPathEnds: string[] = [];

/**
 * Fails requests for the module whose path ends with `pathEnd` (e.g. `/src/tags/tags.tsx`) as a
 * dropped connection would. The browser keeps that import failed for the rest of the spec file.
 */
export function failModuleLoads(pathEnd: string): Promise<void> {
  failedPathEnds.push(pathEnd);
  return commands.failModuleLoads(pathEnd);
}

/** Whether `error` is the browser failing an import that `failModuleLoads` declared. */
export function isFailedModuleLoad(error: Error): boolean {
  const url = /dynamically imported module: (\S+)/.exec(error.message)?.[1]?.split('?')[0];
  return url !== undefined && failedPathEnds.some((pathEnd) => url.endsWith(pathEnd));
}

export function resetFailedModuleLoads(): Promise<void> {
  return commands.resetFailedModuleLoads();
}
