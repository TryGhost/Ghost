import errors from '@tryghost/errors';
import type { NextFunction, Request, Response } from 'express';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import {
  isInDevelopmentTable,
  shouldCreateInDevelopmentTables,
} from '../../data/schema/in-development';
import { recordAppInstallationAction, type RecordAppInstallationAction } from './actions';
import { AppInstallationsService } from './service';

export type { RequestContext } from './actions';
export { actingContext } from './actions';
export type { AppInstallation } from './service';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let service: AppInstallationsService | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordAppInstallationAction = (input) =>
    recordAppInstallationAction({ Action: models.Action, ...input });

  service = new AppInstallationsService({
    knex,
    recordAction,
    // Read per install, not once at boot: both are config, which tests change.
    getManifestRules: () => ({
      ghostUrls: [urlUtils.urlFor('home', true), urlUtils.urlFor('admin', true)],
      allowLocalhost: config.get('env') === 'development',
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

/** Answers as if apps did not exist wherever the table does not. */
export function availableMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next(isAvailable() ? undefined : new errors.NotFoundError());
}
