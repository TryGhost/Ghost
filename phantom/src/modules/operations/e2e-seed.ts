import {readFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import {eq, sql} from 'drizzle-orm';
import {getTableConfig, SQLiteTable} from 'drizzle-orm/sqlite-core';
import type {DbClient} from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import {createGhostImporter} from './importer.js';
import {staffTable} from '../identity/db.js';

export const E2E_OWNER = {
    name: 'Fixture Ghosty',
    email: 'test@ghost.org',
    password: 'Sl1m3rson99'
};

// One bcrypt round of this is ~100ms; cache it across resets.
let cachedPasswordHash: string | null = null;

export const seedFromFixture = async (db: DbClient, fixturePath: string) => {
    const payload = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown;
    const counts = await createGhostImporter(db).importExport(payload);

    cachedPasswordHash ??= bcrypt.hashSync(E2E_OWNER.password, 10);
    // The owner "joins" at seed time, not at the fixture's export date —
    // what's-new banners compare changelog dates against created_at.
    await db.update(staffTable)
        .set({passwordHash: cachedPasswordHash, createdAt: Date.now()})
        .where(eq(staffTable.email, E2E_OWNER.email));

    return counts;
};

// Returns the database to the freshly-seeded state between e2e tests.
// Staff sessions survive so the suite's shared auth cookie stays valid.
export const createE2eReset = (db: DbClient, fixturePath: string) => {
    const tableNames = Object.values(schema as Record<string, unknown>)
        .filter((table): table is SQLiteTable => table instanceof SQLiteTable)
        .map((table) => getTableConfig(table).name)
        .filter((name) => name !== 'staff_sessions');

    return async () => {
        for (const name of tableNames) {
            await db.run(sql.raw(`DELETE FROM "${name}"`));
        }
        // Flows like password reset revoke sessions server-side; the seeded
        // baseline has the suite's shared session active, so restore it.
        await db.run(sql.raw('UPDATE "staff_sessions" SET revoked_at = NULL'));
        await seedFromFixture(db, fixturePath);
    };
};
