import path from 'node:path';
import {
  dependencyIdentity,
  knownViolationsFile,
  readDependencyBoundaries,
} from '../lib/dependency-boundaries.ts';

try {
  const { graph, newViolations, stale } = readDependencyBoundaries(
    path.resolve(import.meta.dirname, '../../..'),
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
      `No new dependency violations (${graph.modules.length} modules, ${graph.summary.violations.length} known violations).`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
