import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    failModuleLoads: (pathEnd: string) => Promise<void>;
    resetFailedModuleLoads: () => Promise<void>;
  }
}

/**
 * Fails requests for the module whose path ends with `pathEnd` (e.g. `/src/tags/tags.tsx`) as a
 * dropped connection would. The browser keeps that import failed for the rest of the spec file.
 */
export function failModuleLoads(pathEnd: string): Promise<void> {
  return commands.failModuleLoads(pathEnd);
}

export function resetFailedModuleLoads(): Promise<void> {
  return commands.resetFailedModuleLoads();
}
