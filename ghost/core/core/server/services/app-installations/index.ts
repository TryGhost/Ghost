import { z } from 'zod';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import {
  isInDevelopmentTable,
  shouldCreateInDevelopmentTables,
} from '../../data/schema/in-development';
import { appInstallationEvents } from './events';
import { createManifestFetcher } from './fetch-manifest';
import { AppInstallationsService } from './service';

export type { RequestContext } from '../../lib/actor';
export { actingContext } from '../../lib/actor';
export type { AppInstallation } from './codec';
export type { AppInstallationPreview } from './service';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let service: AppInstallationsService | undefined;

/**
 * The apps slice of config, parsed here as the config guide asks of a feature's keys.
 * `localhostAlias` is set when Ghost runs in a container in development, where `localhost`
 * is the container rather than the developer's machine. Ignored anywhere else.
 */
const AppsConfig = z.object({ localhostAlias: z.string().min(1).nullable().default(null) });

function localhostAlias(): string | null {
  if (config.get('env') !== 'development') {
    return null;
  }
  return AppsConfig.parse(config.get('apps') ?? {}).localhostAlias;
}

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  const externalRequest = require('../../lib/request-external');

  service = new AppInstallationsService({
    knex,
    events: appInstallationEvents,
    // Read per install, not once at boot: both are config, which tests change.
    getManifestRules: () => ({
      ghostUrls: [urlUtils.urlFor('home', true), urlUtils.urlFor('admin', true)],
      allowLocalhost: config.get('env') === 'development',
    }),
    fetchManifest: createManifestFetcher({
      request: externalRequest,
      getLocalhostAlias: localhostAlias,
    }),
  });
}

/**
 * Whether this database has the installations table.
 *
 * While the table is still in development it only exists in development and testing
 * databases. Once it is finalised and has a migration it exists everywhere, and this is
 * always true.
 */
export function isAvailable(): boolean {
  return !isInDevelopmentTable('app_installations') || shouldCreateInDevelopmentTables();
}
