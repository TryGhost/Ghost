import { z } from 'zod';
import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import {
  isInDevelopmentTable,
  shouldCreateInDevelopmentTables,
} from '../../data/schema/in-development';
import { sanitizeSvgContent } from '../../lib/image/svg-sanitizer';
import {
  actingContext,
  recordAppInstallationAction,
  type RecordAppInstallationAction,
} from './actions';
import { createAppFetcher } from './fetch-from-app';
import { createIconFetcher } from './fetch-icon';
import { createManifestLoader } from './load-manifest';
import { AppInstallationsService } from './service';

export type { RequestContext } from './actions';
export type { AppInstallation } from './codec';
export type { AppInstallationPreview, AppSession } from './service';

/**
 * The apps slice of config, parsed here as the config guide asks of a feature's keys.
 * `localhostAlias` is set when Ghost runs in a container in development, where `localhost`
 * is the container rather than the developer's machine. Ignored anywhere else.
 */
const AppsConfig = z.object({ localhostAlias: z.string().min(1).nullable().default(null) });

// Localhost manifest URLs, and the alias they are fetched through, are for development only.
const isDevelopment = () => config.get('env') === 'development';

function localhostAlias(): string | null {
  if (!isDevelopment()) {
    return null;
  }
  return AppsConfig.parse(config.get('apps') ?? {}).localhostAlias;
}

const extras = { actingContext, isAvailable };

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService(
  'App Installations',
  () => {
    const { knex } = require('../../data/db');
    const models = require('../../models');
    const externalRequest = require('../../lib/request-external');

    const recordAction: RecordAppInstallationAction = (input) =>
      recordAppInstallationAction({ Action: models.Action, logging, ...input });

    const fetchFromApp = createAppFetcher({
      request: externalRequest,
      getLocalhostAlias: localhostAlias,
    });

    return new AppInstallationsService({
      knex,
      recordAction,
      loadManifest: createManifestLoader({
        fetchFromApp,
        logging,
        // Read per load, not once at boot: it's config, which tests change.
        getManifestRules: () => ({
          ghostUrls: [urlUtils.urlFor('home', true), urlUtils.urlFor('admin', true)],
          allowLocalhost: isDevelopment(),
        }),
      }),
      fetchIcon: createIconFetcher({
        fetchFromApp,
        logging,
        sanitizeSvg: (svg) => sanitizeSvgContent(svg, { selfContained: true }),
      }),
    });
  },
  extras,
);

/**
 * Whether this database has the installations table.
 *
 * While the table is still in development it only exists in development and testing
 * databases. Once it is finalised and has a migration it exists everywhere, and this is
 * always true.
 */
function isAvailable(): boolean {
  return !isInDevelopmentTable('app_installations') || shouldCreateInDevelopmentTables();
}
