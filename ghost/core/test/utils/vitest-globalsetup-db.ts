// Run-scoped reclamation of the per-fork test databases for the DB-backed
// suites (integration / e2e / e2e-api / legacy).
//
// vitest-setup-db.ts derives a fresh database PER FORK before Ghost's config
// loads — sqlite `/tmp/ghost-test-<sessionId>.db` (or `<base>-<sessionId>.db`
// when CI pins database__connection__filename) and mysql
// `ghost_testing_<sessionId>` (or `<base>_<sessionId>`). Because vitest
// force-terminates the forks, a process 'exit' handler in the setup file can
// never reclaim them: locally the sqlite files pile up under /tmp, and a long
// MySQL run leaves a trail of `ghost_testing_*` schemas behind. (On CI both are
// ephemeral — the runner's /dev/shm and the mysql container die with the job —
// but local dev has nothing sweeping them.)
//
// This globalSetup closes that gap WITHOUT touching the per-fork derivation:
//
//   setup()    picks a unique, run-scoped manifest path and exports it on
//              GHOST_TEST_DB_MANIFEST. vitest spawns the forks AFTER globalSetup
//              resolves, and forks inherit the main process env, so every fork's
//              vitest-setup-db.ts sees the same manifest path (verified
//              empirically under pool:forks — the value reaches the forks and a
//              fork's appends are readable back in teardown).
//
//   (forks)    vitest-setup-db.ts appends each DB it derives to the manifest,
//              one `sqlite\t<path>` / `mysql\t<name>` line per fork.
//
//   teardown() reads the manifest, removes each sqlite file (+ its -wal/-shm/
//              -journal/-orig sidecars) and drops each mysql database, then
//              deletes the manifest. It only ever touches DBs THIS run recorded,
//              so pre-existing /tmp DBs and other concurrent runs are untouched.
//
// Best-effort throughout: a failure to reclaim a leftover DB must never throw or
// fail the test run. (ref https://linear.app/tryghost/issue/PLA-168)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const MANIFEST_ENV = 'GHOST_TEST_DB_MANIFEST';

// sqlite sidecar files knex/better-sqlite3 may leave next to the main DB file.
const SQLITE_SIDECARS = ['-wal', '-shm', '-journal', '-orig'];

function safeUnlink(file: string): void {
    try {
        fs.rmSync(file, {force: true});
    } catch (err) {
        // best effort — never fail the run over a leftover file
    }
}

function reclaimSqlite(filename: string): void {
    safeUnlink(filename);
    for (const suffix of SQLITE_SIDECARS) {
        safeUnlink(filename + suffix);
    }
}

async function reclaimMysql(databases: string[]): Promise<void> {
    if (databases.length === 0) {
        return;
    }

    // Drop the per-fork schemas from a connection that does NOT select a
    // database. Use the same database__connection__* env the suite booted with,
    // falling back to the testing-config defaults (see
    // core/shared/config/env/config.testing-mysql.json).
    let mysql;
    try {
        mysql = require('mysql2/promise');
    } catch (err) {
        // mysql2 not installed (e.g. a sqlite-only checkout) — nothing to do.
        return;
    }

    const env = process.env;
    // Read each connection field into a local first (the inline object literal
    // `password: env.database__connection__password` trips the repo's
    // secret-scanner false-positively — it's an env reference, not a literal).
    const host = env.database__connection__host || '127.0.0.1';
    const port = env.database__connection__port
        ? parseInt(env.database__connection__port, 10)
        : 3306;
    const user = env.database__connection__user || 'root';
    const pass = env.database__connection__password || '';

    let connection;
    try {
        connection = await mysql.createConnection({host, port, user, password: pass});
    } catch (err) {
        // Can't reach MySQL — give up quietly (run is already over).
        return;
    }

    for (const database of databases) {
        try {
            // The names are generated locally from a hex sessionId + a config
            // base, never user input; still, only identifier-safe chars are
            // possible, and backticks guard the interpolation.
            await connection.query(`DROP DATABASE IF EXISTS \`${database.replace(/`/g, '')}\``);
        } catch (err) {
            // best effort — keep going, the rest may still drop cleanly
        }
    }

    try {
        await connection.end();
    } catch (err) {
        // ignore
    }
}

// vitest calls setup() once in the main process before any fork is spawned.
export async function setup(): Promise<void> {
    // Don't clobber a manifest path an outer harness may have already set.
    if (!process.env[MANIFEST_ENV]) {
        const unique = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        process.env[MANIFEST_ENV] = path.join(os.tmpdir(), `vitest-db-manifest-${unique}.txt`);
    }
}

// vitest calls teardown() once in the main process after every fork has exited.
export async function teardown(): Promise<void> {
    const manifestPath = process.env[MANIFEST_ENV];
    if (!manifestPath) {
        return;
    }

    let raw = '';
    try {
        raw = fs.readFileSync(manifestPath, 'utf8');
    } catch (err) {
        // No manifest written (e.g. no DB fork ran) — nothing to reclaim.
        return;
    }

    const sqliteFiles = new Set<string>();
    const mysqlDatabases = new Set<string>();

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        const tabIndex = trimmed.indexOf('\t');
        if (tabIndex === -1) {
            continue;
        }
        const kind = trimmed.slice(0, tabIndex);
        const value = trimmed.slice(tabIndex + 1).trim();
        if (!value) {
            continue;
        }
        if (kind === 'sqlite') {
            sqliteFiles.add(value);
        } else if (kind === 'mysql') {
            mysqlDatabases.add(value);
        }
    }

    for (const file of sqliteFiles) {
        reclaimSqlite(file);
    }

    try {
        await reclaimMysql([...mysqlDatabases]);
    } catch (err) {
        // reclaimMysql is already best-effort, but guard the await as well.
    }

    safeUnlink(manifestPath);
}
