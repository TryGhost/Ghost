/**
 * assert-boot-skips-modules.ts — preload that fails a Ghost boot if a native
 * module that should load on first use got loaded. The modules are listed in
 * lib/boot-modules.ts.
 *
 * CI boots Ghost with this preloaded:
 *
 *   GHOST_CI_SHUTDOWN_AFTER_BOOT=1 node --import ../tools/scripts/ci/assert-boot-skips-modules.ts index.js
 */
import process from 'node:process';
import { findLoadedModules } from './boot-modules.ts';

process.on('exit', () => {
  const report = process.report.getReport() as { sharedObjects: string[] };
  const loaded = findLoadedModules(report.sharedObjects);

  for (const { module, files } of loaded) {
    console.error(
      `${module.name} was loaded during boot (${module.reason}):\n  ${files.join('\n  ')}`,
    );
  }

  if (loaded.length > 0) {
    process.exitCode = 1;
  }
});
