import path from 'node:path';
import { compareLegacyServicesWithBase } from './legacy-services-base.ts';
import { legacyInventoryFile } from '../../configs/oxlint/legacy-services.ts';

// Fails when a pull request adds a legacy service, or defers dependency checks
// for one. It never skips: without a base to compare with, it fails.
try {
  const { added, newlyDeferred, listed, mergeBase } = compareLegacyServicesWithBase(
    path.resolve(import.meta.dirname, '../../..'),
  );
  for (const name of added) {
    console.error(
      `error ${name} was added to services in ${legacyInventoryFile}. ` +
        'That list only shrinks: a new service must be standard.',
    );
  }
  for (const name of newlyDeferred) {
    console.error(
      `error ${name} now defers dependency checks in ${legacyInventoryFile}. ` +
        'Deferrals only shrink: record its violations instead.',
    );
  }
  if (added.length || newlyDeferred.length) {
    process.exitCode = 1;
  } else {
    console.log(`No legacy services added (${listed} listed, compared with ${mergeBase}).`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
