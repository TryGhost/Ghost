import logging from '@tryghost/logging';
import * as security from '@tryghost/security';
import { defineService } from '../../../kernel/define-service';
import { shouldCreateInDevelopmentTables } from '../../data/schema/in-development';
import { assertDatabaseSupported, createAuth, type GhostAuth } from './create-auth';

export type { GhostAuth } from './create-auth';

// Boot initializes this after settings, which follows the database (and its
// in-development tables), and only when auth:engine is better-auth
export default defineService('Better Auth', async (): Promise<GhostAuth> => {
  const config = require('../../../shared/config');
  const settingsCache = require('../../../shared/settings-cache');
  const urlUtils = require('../../../shared/url-utils').default;
  const { knex } = require('../../data/db');
  const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');

  assertDatabaseSupported({
    client: config.get('database:client'),
    inDevelopmentTables: shouldCreateInDevelopmentTables(),
  });

  const auth = createAuth({
    db: knex,
    secret: settingsCache.get('admin_session_secret'),
    sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
    urlUtils,
    password: security.password,
    logger: logging,
    limiters: {
      globalBlock: spamPrevention.globalBlock,
      globalReset: spamPrevention.globalReset,
      userLogin: spamPrevention.userLogin,
      userReset: spamPrevention.userReset,
    },
  });
  // betterAuth() defers its setup to this promise; awaiting it fails boot, not the first request
  await auth.$context;
  return auth;
});
