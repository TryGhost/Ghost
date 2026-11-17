import type { DomainManifest } from '../../kernel/domains/discover';
import application, { domainsRoot } from '../app';

export { domainsRoot };

/**
 * What ghost/domains contains, read from disk the first time this is called
 * and kept for the life of the process. Reading it loads no domain code and
 * builds no foundation instance, so the central registries that merge
 * fragments (schema, settings, permissions) can use it however early they load.
 */
export function getDomainManifest(): DomainManifest {
  return application.manifest;
}
