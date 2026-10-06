/**
 * Native modules Ghost should only load on first use, never at boot. Each one
 * is spotted by the shared objects it maps into the process (see
 * `process.report.getReport().sharedObjects`).
 *
 * @typedef {{ name: string, reason: string, sharedObject: RegExp }} LazyModule
 * @type {LazyModule[]}
 */
export const NOT_AT_BOOT = [
  {
    name: 'sharp',
    reason: 'libvips costs ~9 MB RSS per process and is only needed to process images',
    sharedObject: /libvips|[/\\]sharp-[^/\\]+\.node$/,
  },
];

/**
 * @param {string[]} sharedObjects
 * @param {LazyModule[]} [modules]
 * @returns {{ module: LazyModule, files: string[] }[]} the modules that are loaded
 */
export function findLoadedModules(sharedObjects, modules = NOT_AT_BOOT) {
  return modules
    .map((module) => ({
      module,
      files: sharedObjects.filter((file) => module.sharedObject.test(file)),
    }))
    .filter(({ files }) => files.length > 0);
}
