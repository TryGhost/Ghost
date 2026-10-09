import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    failModuleLoads: (pathEnd: string) => Promise<void>;
    resetFailedModuleLoads: () => Promise<void>;
  }
}

/**
 * Fails every browser request for the module whose path ends with `pathEnd`
 * (e.g. `/src/tags/tags.tsx`) as a dropped connection would, so its dynamic
 * import rejects. The browser keeps a failed import failed for the rest of the spec file.
 */
export function failModuleLoads(pathEnd: string): Promise<void> {
  return commands.failModuleLoads(pathEnd);
}

export function resetFailedModuleLoads(): Promise<void> {
  return commands.resetFailedModuleLoads();
}
