import path from 'node:path';
import {
  dependencyIdentity,
  knownViolationsFile,
  readDependencyBoundaries,
} from '../lib/dependency-boundaries.ts';

// With no arguments this scans everything. The commit hook passes the staged
// files after `--`, so the same known violations apply there as in CI.
const files = process.argv.slice(2).filter((argument) => argument !== '--');

try {
  const { graph, newViolations, stale, deferred } = readDependencyBoundaries(
    path.resolve(import.meta.dirname, '../../..'),
    files,
  );
  for (const violation of newViolations) {
    const { rule, from, to } = dependencyIdentity(violation);
    console.error(`error ${rule}: ${from} → ${to}`);
  }
  for (const { rule, from, to } of stale) {
    console.error(
      `error stale known violation: ${from} → ${to} [${rule}]. Remove it from ${knownViolationsFile}.`,
    );
  }
  if (newViolations.length || stale.length) {
    process.exitCode = 1;
  } else {
    console.log(
      `No new dependency violations (${graph.modules.length} modules, ${graph.summary.violations.length - deferred.length} known violations, ${deferred.length} in services with deferred enforcement).`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
