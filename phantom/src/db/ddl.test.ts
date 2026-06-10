import {describe, expect, it} from 'vitest';
import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {sql} from 'drizzle-orm';
import {ensureCoreSchema} from './ddl.js';
import {postTable} from '../modules/content/db.js';

describe('ensureCoreSchema', () => {
    it('creates all tables on an empty database', async () => {
        const db = drizzle(createClient({url: ':memory:'}));
        await ensureCoreSchema(db);

        const tables = await db.all(sql.raw("SELECT name FROM sqlite_master WHERE type = 'table'")) as Array<{name: string}>;
        const names = new Set(tables.map((table) => table.name));
        for (const expected of ['posts', 'tags', 'posts_tags', 'posts_authors', 'author_profiles', 'settings', 'members', 'newsletters', 'plans', 'staff_accounts']) {
            expect(names.has(expected), `missing table ${expected}`).toBe(true);
        }
    });

    it('adds missing columns to tables created by an older schema', async () => {
        const db = drizzle(createClient({url: ':memory:'}));
        await db.run(sql.raw(`CREATE TABLE posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            slug TEXT NOT NULL,
            status TEXT NOT NULL,
            lexical TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`));

        await ensureCoreSchema(db);

        await db.insert(postTable).values({
            id: 'p1',
            uuid: 'u1',
            title: 'Hello',
            slug: 'hello',
            type: 'post',
            status: 'published',
            lexical: '{}',
            html: '<p>Hi</p>',
            featured: 1,
            createdAt: 1,
            updatedAt: 1
        });

        const rows = await db.select().from(postTable);
        expect(rows[0]?.html).toBe('<p>Hi</p>');
        expect(rows[0]?.featured).toBe(1);
        expect(rows[0]?.visibility).toBe('public');
    });
});
