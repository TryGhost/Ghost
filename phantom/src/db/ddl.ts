import {sql} from 'drizzle-orm';
import {getTableConfig, SQLiteTable} from 'drizzle-orm/sqlite-core';
import * as schema from './schema/index.js';
import type {DbClient} from './client.js';

const renderDefault = (value: unknown) => {
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
    }
    return null;
};

export const buildCreateTableStatements = () => {
    return Object.values(schema as Record<string, unknown>)
        .filter((table): table is SQLiteTable => table instanceof SQLiteTable)
        .map((table) => {
            const config = getTableConfig(table);
            const columns = config.columns.map((column) => renderColumnDdl(column));
            return `CREATE TABLE IF NOT EXISTS "${config.name}" (${columns.join(', ')})`;
        });
};

const renderColumnDdl = (column: ReturnType<typeof getTableConfig>['columns'][number], forAlter = false) => {
    const parts = [`"${column.name}" ${column.getSQLType().toUpperCase()}`];
    if (!forAlter && column.primary) {
        parts.push('PRIMARY KEY');
    }
    if (column.notNull) {
        parts.push('NOT NULL');
    }
    if (column.hasDefault) {
        const rendered = renderDefault(column.default);
        if (rendered !== null) {
            parts.push(`DEFAULT ${rendered}`);
        }
    } else if (forAlter && column.notNull) {
        // SQLite requires a default when adding NOT NULL columns to rows that
        // already exist; fall back to the type's zero value.
        parts.push(column.getSQLType().toUpperCase().includes('INT') ? 'DEFAULT 0' : `DEFAULT ''`);
    }
    return parts.join(' ');
};

export const ensureCoreSchema = async (db: DbClient) => {
    for (const statement of buildCreateTableStatements()) {
        await db.run(sql.raw(statement));
    }

    // Reconcile pre-existing tables with columns added since they were created.
    const tables = Object.values(schema as Record<string, unknown>)
        .filter((table): table is SQLiteTable => table instanceof SQLiteTable);
    for (const table of tables) {
        const config = getTableConfig(table);
        const existing = await db.all(sql.raw(`PRAGMA table_info("${config.name}")`)) as Array<{name: string}>;
        const present = new Set(existing.map((column) => column.name));
        for (const column of config.columns) {
            if (!present.has(column.name)) {
                await db.run(sql.raw(`ALTER TABLE "${config.name}" ADD COLUMN ${renderColumnDdl(column, true)}`));
            }
        }
    }
};
