import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import config from '../../../shared/config';
import db from '../db';
// @ts-expect-error This module lacks type definitions.
import commands from './commands';
// @ts-expect-error This module lacks type definitions.
import schema from './schema';

/**
 * Tables listed here are defined in `schema.js` but are still being iterated on.
 *
 * - `knex-migrator init` only creates them when `createInDevelopmentTables` is
 *   enabled in config (development and testing environments by default), so
 *   production databases never contain them.
 * - Boot creates any that are missing from an existing development database.
 * - They need no versioned migration and are left out of the schema integrity
 *   hash, so their definition can change freely.
 *
 * Once a table's definition is final, remove it from this list and add the
 * versioned migration that creates it.
 *
 * Code that reads or writes these tables must only run behind a feature flag
 * that is off wherever the tables are not created.
 */
export const IN_DEVELOPMENT_TABLES: string[] = [];

export function isInDevelopmentTable(tableName: string): boolean {
  return IN_DEVELOPMENT_TABLES.includes(tableName);
}

export function shouldCreateInDevelopmentTables(): boolean {
  return config.get('createInDevelopmentTables') === true;
}

/**
 * The in-development tables in `schema.js` order, which is dependency order
 */
export function getInDevelopmentTables(): string[] {
  return Object.keys(schema).filter(isInDevelopmentTable);
}

/**
 * The tables `knex-migrator init` should create in the current environment
 */
export function getTablesToCreate(): string[] {
  const includeInDevelopment = shouldCreateInDevelopmentTables();
  return Object.keys(schema).filter(
    (tableName) => includeInDevelopment || !isInDevelopmentTable(tableName),
  );
}

/**
 * Creates in-development tables missing from an already initialised database
 */
export async function createMissingInDevelopmentTables(knex: Knex = db.knex): Promise<void> {
  if (!shouldCreateInDevelopmentTables()) {
    return;
  }

  const tables = getInDevelopmentTables();
  if (!tables.length) {
    return;
  }

  const existingTables: string[] = await commands.getTables(knex);

  for (const tableName of tables) {
    if (!existingTables.includes(tableName)) {
      logging.info(`Creating in-development table: ${tableName}`);
      await commands.createTable(tableName, knex);
    }
  }
}

/**
 * Drops and recreates every in-development table, discarding its data, so the
 * database picks up changes to their definitions in `schema.js`
 */
export async function rebuildInDevelopmentTables(knex: Knex = db.knex): Promise<void> {
  if (!shouldCreateInDevelopmentTables()) {
    logging.warn(
      'In-development tables are disabled in this environment (createInDevelopmentTables)',
    );
    return;
  }

  const tables = getInDevelopmentTables();

  for (const tableName of tables.toReversed()) {
    logging.info(`Dropping in-development table: ${tableName}`);
    await commands.deleteTable(tableName, knex);
  }

  for (const tableName of tables) {
    logging.info(`Creating in-development table: ${tableName}`);
    await commands.createTable(tableName, knex);
  }
}
