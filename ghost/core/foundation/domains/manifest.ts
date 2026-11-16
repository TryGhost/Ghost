import path from 'node:path';
import { discoverDomains, type DomainManifest } from '../../kernel/domains/discover';

/** The folder that holds one folder per domain. */
export const domainsRoot = path.resolve(__dirname, '../../../domains');

let manifest: DomainManifest | undefined;

/**
 * What ghost/domains contains, read from disk the first time this is called
 * and kept for the life of the process. Reading it loads no domain code.
 *
 * This file imports only the kernel, so the central registries that merge
 * fragments (schema, settings, permissions) can use it however early they load.
 */
export function getDomainManifest(): DomainManifest {
  manifest ??= discoverDomains(domainsRoot);
  return manifest;
}
