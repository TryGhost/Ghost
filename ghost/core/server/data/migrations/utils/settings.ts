import ObjectId from 'bson-objectid';
import logging from '@tryghost/logging';
import { createTransactionalMigration, type Migration } from './migrations';

const MIGRATION_USER = 1;

interface SettingSpec {
  key: string;
  value: unknown;
  type: 'array' | 'string' | 'number' | 'boolean' | 'object';
  group: string;
  flags?: 'PUBLIC' | 'RO' | 'PUBLIC,RO' | null;
}

/**
 * Creates a migration which will insert a new setting in settings table
 */
export function addSetting({ key, value, type, group, flags = null }: SettingSpec): Migration {
  return createTransactionalMigration(
    async function up(connection) {
      const settingExists = await connection('settings').where('key', '=', key).first();
      if (settingExists) {
        logging.warn(`Skipping adding setting: ${key} - setting already exists`);
        return;
      }

      logging.info(`Adding setting: ${key}`);
      const now = connection.raw('CURRENT_TIMESTAMP');

      const data: Record<string, unknown> = {
        id: ObjectId().toHexString(),
        key,
        value,
        group,
        type,
        flags,
        created_at: now,
      };

      if (await connection.schema.hasColumn('settings', 'created_by')) {
        data.created_by = MIGRATION_USER;
      }

      if (await connection.schema.hasColumn('settings', 'updated_by')) {
        data.updated_by = MIGRATION_USER;
      }

      return connection('settings').insert(data);
    },
    async function down(connection) {
      const settingExists = await connection('settings').where('key', '=', key).first();
      if (!settingExists) {
        logging.warn(`Skipping dropping setting: ${key} - setting does not exist`);
        return;
      }

      logging.info(`Dropping setting: ${key}`);
      return connection('settings').where('key', '=', key).del();
    },
  );
}

export function removeSetting(key: string): Migration {
  let originalSetting: Record<string, unknown> | null = null;

  return createTransactionalMigration(
    async function up(connection) {
      const settingExists = await connection('settings').where('key', '=', key).first();
      if (!settingExists) {
        logging.warn(`Skipping removing setting: ${key} - setting does not exist`);
        return;
      }

      // Store the original setting data for the down migration
      originalSetting = settingExists;

      logging.info(`Removing setting: ${key}`);
      return connection('settings').where('key', '=', key).del();
    },
    async function down(connection) {
      const settingExists = await connection('settings').where('key', '=', key).first();
      if (settingExists) {
        logging.warn(`Skipping restoring setting: ${key} - setting already exists`);
        return;
      }

      if (!originalSetting) {
        logging.warn(`Skipping restoring setting: ${key} - no original setting data found`);
        return;
      }

      logging.info(`Restoring setting: ${key}`);
      const now = connection.raw('CURRENT_TIMESTAMP');

      const data: Record<string, unknown> = {
        id: ObjectId().toHexString(),
        key,
        value: originalSetting.value,
        group: originalSetting.group,
        type: originalSetting.type,
        flags: originalSetting.flags,
        created_at: now,
      };

      if (await connection.schema.hasColumn('settings', 'created_by')) {
        data.created_by = MIGRATION_USER;
      }

      if (await connection.schema.hasColumn('settings', 'updated_by')) {
        data.updated_by = MIGRATION_USER;
      }

      return connection('settings').insert(data);
    },
  );
}
