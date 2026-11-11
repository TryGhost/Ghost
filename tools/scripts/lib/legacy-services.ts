import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const servicesRoot = 'ghost/core/server/services';
export const legacyInventoryFile = `${servicesRoot}/legacy-service-inventory.yaml`;

export interface LegacyService {
  /** Boundary lint reports this service's violations without failing on them. */
  deferred: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Every service check applies to every service, unless the service is listed
// under `services` in the legacy service inventory. Lint, boundary lint and the
// reports all read that list here, so there is one definition of "legacy".
export function parseLegacyServices(source: string): Map<string, LegacyService> {
  const inventory = yaml.load(source);
  const services = isRecord(inventory) ? inventory.services : undefined;
  if (!isRecord(services)) {
    throw new Error(`${legacyInventoryFile}: expected a services mapping.`);
  }
  const legacy = new Map<string, LegacyService>();
  for (const [name, entry] of Object.entries(services)) {
    const checks = isRecord(entry) ? entry.dependencyChecks : undefined;
    if (!isRecord(entry) || (checks !== undefined && checks !== 'deferred')) {
      throw new Error(
        `${legacyInventoryFile}: ${name} must be a mapping, and dependencyChecks can only be "deferred".`,
      );
    }
    legacy.set(name, { deferred: checks === 'deferred' });
  }
  return legacy;
}

export function readLegacyServices(repository: string) {
  return parseLegacyServices(readFileSync(path.join(repository, legacyInventoryFile), 'utf8'));
}
