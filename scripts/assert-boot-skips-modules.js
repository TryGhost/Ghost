/**
 * assert-boot-skips-modules.js — preload that fails a Ghost boot if a native
 * module that should load on first use got loaded. The modules are listed in
 * lib/boot-modules.js.
 *
 * CI boots Ghost with this preloaded:
 *
 *   GHOST_CI_SHUTDOWN_AFTER_BOOT=1 node --import ../../scripts/assert-boot-skips-modules.js index.js
 */
import process from 'node:process';
import { findLoadedModules } from './lib/boot-modules.js';

process.on('exit', () => {
  const loaded = findLoadedModules(process.report.getReport().sharedObjects);

  for (const { module, files } of loaded) {
    console.error(
      `${module.name} was loaded during boot (${module.reason}):\n  ${files.join('\n  ')}`,
    );
  }

  if (loaded.length > 0) {
    process.exitCode = 1;
  }
});
