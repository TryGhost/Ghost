import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    failModuleLoads: (pathEnd: string) => Promise<void>;
    holdModuleLoads: (pathEnd: string) => Promise<void>;
    releaseModuleLoads: (pathEnd: string) => Promise<void>;
    resetModuleRoutes: () => Promise<void>;
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
 * Holds back requests for the module whose path ends with `pathEnd`, as a slow connection would. A
 * navigation to a route the module serves stays pending until the spec calls the release function
 * this returns. The end of the spec releases it too. Once loaded, the browser keeps the module for
 * the rest of the spec file, so this only holds a module that no earlier spec in the file loaded.
 */
export async function holdModuleLoads(pathEnd: string): Promise<() => Promise<void>> {
  await commands.holdModuleLoads(pathEnd);
  return () => commands.releaseModuleLoads(pathEnd);
}

export function resetModuleRoutes(): Promise<void> {
  return commands.resetModuleRoutes();
}
