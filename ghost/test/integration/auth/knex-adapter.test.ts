import { describe } from 'vitest';
import {
  authFlowTestSuite,
  caseInsensitiveTestSuite,
  joinsTestSuite,
  normalTestSuite,
  testAdapter,
  transactionsTestSuite,
} from '@better-auth/test-utils/adapter';
import type { BetterAuthOptions } from 'better-auth/types';
import { getAuthTables } from 'better-auth/db';
import ObjectId from 'bson-objectid';
import knex, { type Knex } from 'knex';
import config from '../../../core/shared/config';
import { configure, type DatabaseConfig } from '../../../core/server/data/db/configure-knex';
import { createKnexAdapter } from '../../../core/server/auth/better-auth/knex-adapter';
import {
  ghostCreateDefaults,
  ghostModelOptions,
  ghostVirtualColumns,
} from '../../../core/server/auth/better-auth/ghost-models';

const commands = require('../../../core/server/data/schema/commands');
const schema = require('../../../core/server/data/schema/schema');

// Better Auth's adapter suite against MySQL (PLA-595). Tests that cannot pass
// against Ghost's schema are skipped below with their cause; see
// core/server/auth/better-auth/README.md.
//
// Each lane gets its own database so the suite's cleanup (which deletes every
// row of every auth table) never touches Ghost's tables. The suite rebuilds
// the schema whenever it changes Better Auth's options, so tables are dropped
// and recreated from getAuthTables() on every migration.
//
//  - `better-auth tables`: every model in Better Auth's own shape under Ghost's
//    names. Isolates the adapter's query handling from Ghost's schema.
//  - `ghost users`: `users` in Ghost's shape (schema.js) with the virtual
//    `email_verified` column, as the instance will run.

const dbConfig = config.get('database') as DatabaseConfig;
const baseDatabase = (dbConfig.connection as { database: string }).database;

const knexFor = (database?: string) =>
  knex(configure({ ...dbConfig, connection: { ...dbConfig.connection, database } }));

type FieldAttributes = ReturnType<typeof getAuthTables>[string]['fields'][string];

function addColumn(t: Knex.CreateTableBuilder, name: string, field: FieldAttributes) {
  const indexed = field.unique || field.index || field.references || field.sortable;
  switch (field.type) {
    case 'boolean':
      t.boolean(name);
      break;
    case 'number':
      if (field.bigint) {
        t.bigInteger(name);
      } else {
        t.integer(name);
      }
      break;
    case 'date':
      t.dateTime(name, { precision: 3 });
      break;
    case 'string':
      if (indexed) {
        t.string(name, 191);
      } else {
        t.text(name);
      }
      break;
    default:
      // json, string[] and number[] are stored serialised
      t.text(name);
  }
  if (field.unique) {
    t.unique([name]);
  } else if (field.index) {
    t.index([name]);
  }
}

// MySQL's default _ci collation compares case-insensitively; a binary
// collation per query would stop token and email lookups using their indexes
const collation = {
  'findOne - eq with mode sensitive (default) should not match different case': true,
};

const ghostUsersSkips = {
  // users.created_at/updated_at are DATETIME without fractional seconds
  'create - should create a model': true,
  // emailVerified is virtual and always true (plan §4.3), so false is never stored
  'update - should return null when a multi-predicate where matches no row': true,
  'deleteMany - should delete many models with boolean values': true,
  'findMany - eq and ne operators with null value in AND group should use IS NULL / IS NOT NULL': true,
  // Rename users.email, which Ghost's fixed table cannot follow
  'findOne - should find a model with modified field name': true,
  'findOne - should join a model with modified field name': true,
};

function lane(name: string, { ghostUsers }: { ghostUsers: boolean }) {
  const database = `${baseDatabase}_ba_${ghostUsers ? 'ghost' : 'plain'}`;
  const db = knexFor(database);

  const withGhostModels = (opts: BetterAuthOptions): BetterAuthOptions => {
    const merged: Record<string, unknown> = {};
    for (const [model, mapping] of Object.entries(ghostModelOptions)) {
      const current = (
        opts as Record<string, { modelName?: string; fields?: Record<string, string> }>
      )[model];
      merged[model] = {
        modelName: current?.modelName ?? mapping.modelName,
        fields: { ...mapping.fields, ...current?.fields },
      };
    }
    return merged as BetterAuthOptions;
  };

  const runMigrations = async (options: BetterAuthOptions) => {
    const admin = knexFor();
    try {
      await admin.raw('CREATE DATABASE IF NOT EXISTS ??', [database]);
    } finally {
      await admin.destroy();
    }

    const [rows] = await db.raw('SHOW TABLES');
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    for (const row of rows as Record<string, string>[]) {
      await db.schema.dropTable(Object.values(row)[0]);
    }
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    for (const table of Object.values(getAuthTables(options))) {
      const fields = Object.entries(table.fields).map(
        ([key, field]) => [field.fieldName ?? key, field] as const,
      );

      if (ghostUsers && table.modelName === 'users') {
        await commands.createTable('users', db, schema.users);
        const virtual = ghostVirtualColumns.users;
        const missing = fields.filter(
          ([column]) => !(column in schema.users) && !(column in virtual),
        );
        if (missing.length) {
          await db.schema.alterTable('users', (t) => {
            for (const [column, field] of missing) {
              addColumn(t, column, field);
            }
          });
        }
        continue;
      }

      // Nullable throughout: the suite reuses one schema across tests whose
      // required fields differ, and nullability is not the adapter's concern
      await db.schema.createTable(table.modelName, (t) => {
        t.string('id', 24).primary();
        for (const [column, field] of fields) {
          addColumn(t, column, field);
        }
      });
    }
  };

  return testAdapter({
    adapter: () =>
      createKnexAdapter({
        db,
        virtualColumns: ghostUsers ? ghostVirtualColumns : {},
        createDefaults: ghostUsers ? ghostCreateDefaults : {},
      }),
    runMigrations,
    overrideBetterAuthOptions: withGhostModels,
    customIdGenerator: () => new ObjectId().toHexString(),
    prefixTests: name,
    tests: [
      normalTestSuite({ disableTests: ghostUsers ? ghostUsersSkips : {} }),
      joinsTestSuite({ disableTests: ghostUsers ? ghostUsersSkips : {} }),
      transactionsTestSuite(),
      caseInsensitiveTestSuite({ disableTests: collation }),
      // Expects a new user's emailVerified to be false; it is virtual and always true
      authFlowTestSuite({
        disableTests: ghostUsers ? { 'should successfully sign up': true } : {},
      }),
      // numberIdTestSuite and uuidTestSuite do not apply: Ghost ids are ObjectIds
    ],
    async onFinish() {
      await db.raw('DROP DATABASE IF EXISTS ??', [database]);
      await db.destroy();
    },
  });
}

describe('Knex adapter: better-auth tables', async () => {
  (await lane('better-auth tables', { ghostUsers: false })).execute();
});

describe('Knex adapter: ghost users', async () => {
  (await lane('ghost users', { ghostUsers: true })).execute();
});
