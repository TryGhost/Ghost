export interface LazyModule {
  name: string;
  reason: string;
  sharedObject: RegExp;
}

export interface LoadedModule {
  module: LazyModule;
  files: string[];
}

/**
 * Native modules Ghost should only load on first use, never at boot. Each one
 * is spotted by the shared objects it maps into the process (see
 * `process.report.getReport().sharedObjects`).
 */
export const NOT_AT_BOOT: LazyModule[] = [
  {
    name: 'sharp',
    reason: 'libvips costs ~9 MB RSS per process and is only needed to process images',
    sharedObject: /libvips|[/\\]sharp-[^/\\]+\.node$/,
  },
];

/** Returns the modules that are loaded. */
export function findLoadedModules(
  sharedObjects: string[],
  modules: LazyModule[] = NOT_AT_BOOT,
): LoadedModule[] {
  return modules
    .map((module) => ({
      module,
      files: sharedObjects.filter((file) => module.sharedObject.test(file)),
    }))
    .filter(({ files }) => files.length > 0);
}
