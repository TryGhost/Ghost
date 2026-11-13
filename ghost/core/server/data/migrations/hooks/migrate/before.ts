import logging from '@tryghost/logging';
import config from '../../../../../shared/config';

const dbBackup = require('../../../db/backup');

export default function before() {
  // Skip the pre-migration backup when disabled at the platform level. This is
  // distinct from `disableJSBackups` (which disables all JS backups, e.g. the
  // importer path) — it only skips backups taken before running migrations.
  if (config.get('disableMigrationBackups')) {
    logging.info('Database backup before migration is disabled in Ghost config');
    return;
  }

  return dbBackup.backup();
}
