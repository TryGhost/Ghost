import { z } from 'zod';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import {
  actingContext,
  recordAppInstallationAction,
  type RecordAppInstallationAction,
} from './actions';
import { createAppFetcher } from './fetch-from-app';
import { createIdentityChecker, readTrustedOrigins } from './identity-check';
import { createManifestLoader } from './load-manifest';
import { AppInstallationsService } from './service';

export type { RequestContext } from './actions';
export type { Installation, InstallationWithHistory } from './codec';
export type { AppInstallation } from './serializers';
export type { AppInstallationPreview, AppSession } from './service';

/**
 * The apps slice of config, parsed here as the config guide asks of a feature's keys.
 *
 * - `localhostAlias` is set when Ghost runs in a container in development, where
 *   `localhost` is the container rather than the developer's machine. Ignored anywhere
 *   else.
 * - `trustedOrigins` lists the origins the site trusts to skip the challenge. It's read at
 *   boot, so an entry that isn't an origin stops Ghost starting instead of failing every
 *   app.
 */
const AppsConfig = z.object({
  localhostAlias: z.string().min(1).nullable().default(null),
  trustedOrigins: z
    .unknown()
    .default([])
    .transform((entries, ctx) => {
      const read = readTrustedOrigins(entries);
      if (!read.success) {
        ctx.addIssue({
          code: 'custom',
          message: `Expected a list of origins, such as https://app.example.com, not ${JSON.stringify(read.entry)}`,
        });
        return z.NEVER;
      }
      return read.origins;
    }),
});

function appsConfig() {
  const parsed = AppsConfig.safeParse(config.get('apps') ?? {});
  if (!parsed.success) {
    throw new errors.InternalServerError({
      message: 'The apps config is not valid.',
      code: 'APP_CONFIG_INVALID',
      context: z.prettifyError(parsed.error),
    });
  }
  return parsed.data;
}

// Localhost manifest URLs, and the alias they are fetched through, are for development only.
const isDevelopment = () => config.get('env') === 'development';

function localhostAlias(): string | null {
  if (!isDevelopment()) {
    return null;
  }
  return appsConfig().localhostAlias;
}

const extras = { actingContext };

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService(
  'App Installations',
  () => {
    // Checked now, so a mistake in it is found at boot. It's still read per use, as tests
    // change config.
    appsConfig();
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
      identity: createIdentityChecker({
        fetchFromApp,
        logging,
        // Read per check, not once at boot: it's config, which tests change.
        getTrustConfig: () => ({
          trustedOrigins: appsConfig().trustedOrigins,
          trustLoopback: isDevelopment(),
        }),
        getAllowLocalhost: isDevelopment,
      }),
    });
  },
  extras,
);
