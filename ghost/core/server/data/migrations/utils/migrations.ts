import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type KnexMigrator from 'knex-migrator';

export type MigrationFunction = (connection: Knex) => Promise<unknown>;

export interface Migration {
  config: KnexMigrator.MigrationConfig;
  up(options: KnexMigrator.MigrationContext): Promise<void>;
  down(options: KnexMigrator.MigrationContext): Promise<void>;
}

export function createNonTransactionalMigration(
  up: MigrationFunction,
  down: MigrationFunction,
): Migration {
  return {
    config: {
      transaction: false,
    },
    async up(config) {
      await up(config.connection!);
    },
    async down(config) {
      await down(config.connection!);
    },
  };
}

export function createIrreversibleMigration(up: MigrationFunction): Migration {
  return {
    config: {
      irreversible: true,
    },
    async up(config) {
      await up(config.connection!);
    },
    async down() {
      return Promise.reject();
    },
  };
}

export function createTransactionalMigration(
  up: MigrationFunction,
  down: MigrationFunction,
): Migration {
  return {
    config: {
      transaction: true,
    },
    async up(config) {
      await up(config.transacting!);
    },
    async down(config) {
      await down(config.transacting!);
    },
  };
}

export function combineTransactionalMigrations(...migrations: Migration[]): Migration {
  return {
    config: {
      transaction: true,
    },
    async up(config) {
      for (const migration of migrations) {
        await migration.up(config);
      }
    },
    async down(config) {
      // Down migrations must be run backwards!!
      for (const migration of migrations.toReversed()) {
        await migration.down(config);
      }
    },
  };
}

export function combineNonTransactionalMigrations(...migrations: Migration[]): Migration {
  return {
    config: {
      transaction: false,
    },
    async up(config) {
      for (const migration of migrations) {
        await migration.up(config);
      }
    },
    async down(config) {
      // Down migrations must be run backwards!!
      for (const migration of migrations.toReversed()) {
        await migration.down(config);
      }
    },
  };
}

export function createFinalMigration(major: number): Migration {
  return createTransactionalMigration(
    async function up() {
      throw new errors.InternalServerError({
        message: `Unable to run migrations`,
        context: `You must be on the latest v${major}.x to update across major versions - https://docs.ghost.org/update/`,
        help: `Run 'ghost update v${major}' to get the latest v${major}.x version, then run 'ghost update' to get to the latest.`,
      });
    },
    async function down() {
      // no-op
    },
  );
}
