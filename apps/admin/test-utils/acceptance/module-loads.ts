import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    delayModuleLoads: (pathEnd: string, delayMs: number) => Promise<void>;
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

/**
 * Holds requests for the module whose path ends with `pathEnd` back for `delayMs`, as a slow
 * connection would, so a navigation to a route it serves stays pending meanwhile. Once loaded,
 * the browser keeps it for the rest of the spec file, so only a module no earlier spec in the
 * file loads is held.
 */
export function delayModuleLoads(pathEnd: string, delayMs: number): Promise<void> {
  return commands.delayModuleLoads(pathEnd, delayMs);
}

export function resetFailedModuleLoads(): Promise<void> {
  return commands.resetFailedModuleLoads();
}
