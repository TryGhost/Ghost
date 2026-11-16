import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import locations from './service-locations.cjs';

export const { servicesRoot, domainsRoot, bootOwnedServiceHomes, allServiceHomes } = locations;
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

export interface ServiceLocation {
  /** The service name: its directory name, which is unique across homes. */
  name: string;
  /** The service directory, relative to the repository, with forward slashes. */
  directory: string;
  /** The domain the service has moved into, or undefined in the original home. */
  domain?: string;
}

const bootOwnedFile = new RegExp(`^(${bootOwnedServiceHomes})/([^/]+)(?:/(.*))?$`);

/**
 * The boot-owned service a repository-relative file belongs to, in either home:
 * `ghost/core/server/services/<name>/` or
 * `ghost/domains/<domain>/transition/services/<name>/`.
 */
export function serviceOfFile(file: string) {
  const match = bootOwnedFile.exec(file);
  return match
    ? { name: match[2]!, directory: `${match[1]}/${match[2]}`, rest: match[3] ?? '' }
    : undefined;
}

/**
 * Every boot-owned service entry on disk, in both homes. The original home can
 * hold standalone files and metadata as well as directories; a domain's
 * transition/services holds directories only.
 */
export function listServiceLocations(repository: string): ServiceLocation[] {
  const entries = (directory: string) =>
    existsSync(path.join(repository, directory))
      ? readdirSync(path.join(repository, directory), { withFileTypes: true })
      : [];
  const found: ServiceLocation[] = entries(servicesRoot)
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, directory: `${servicesRoot}/${entry.name}` }));
  for (const domain of entries(domainsRoot).filter((entry) => entry.isDirectory())) {
    const home = `${domainsRoot}/${domain.name}/transition/services`;
    for (const entry of entries(home).filter((item) => item.isDirectory())) {
      found.push({ name: entry.name, directory: `${home}/${entry.name}`, domain: domain.name });
    }
  }
  const names = new Map<string, string>();
  for (const { name, directory } of found) {
    const other = names.get(name);
    if (other !== undefined) {
      throw new Error(`Service name ${name} is used twice: ${other} and ${directory}.`);
    }
    names.set(name, directory);
  }
  return found;
}
