// Cloudflare Workers entry point (decision #13: Workers-first runtime).
// Static files come from the wrangler assets binding (staged by
// `yarn worker:assets`), theme bundles are compiled into the worker bundle
// (no runtime code evaluation), and configuration arrives through worker
// vars, which the nodejs_compat flag mirrors onto process.env.
import {drizzle as drizzleD1, type AnyD1Database} from 'drizzle-orm/d1';
import {createApp} from './app/app.js';
import {createAppDependencies} from './app/bootstrap.js';
import type {DbClient} from './db/client.js';
import {createWorkersFileStore} from './platform/files/workers.js';
import {createStaticThemeBundles} from './frontend/themes/bundles.js';
import casperBundle from '../content/themes/casper/bundle.mjs';
import sourceBundle from '../content/themes/source/bundle.mjs';

type WorkerEnv = {
    ASSETS: {fetch: (request: Request | URL) => Promise<Response>};
    // D1 binding (wrangler.jsonc d1_databases); without it the worker falls
    // back to the GHOST_DB_URL libSQL client.
    DB?: AnyD1Database;
};

type FetchApp = {fetch: (request: Request) => Response | Promise<Response>};

// One app per isolate: dependency creation (config, schema check) runs once
// and is reused across requests.
let appPromise: Promise<FetchApp> | null = null;

const getApp = (env: WorkerEnv) => {
    appPromise ??= (async () => {
        const dependencies = await createAppDependencies({
            fileStore: createWorkersFileStore(env.ASSETS),
            themeBundles: createStaticThemeBundles({
                casper: casperBundle,
                source: sourceBundle
            }),
            ...(env.DB
                ? {
                    // Same drizzle SQLite dialect, different driver result
                    // generics; every call site uses the shared query
                    // builder surface, so the cast is sound at runtime.
                    db: drizzleD1(env.DB) as unknown as DbClient,
                    // D1 rejects explicit BEGIN/COMMIT.
                    atomicImport: false
                }
                : {})
        });
        return createApp(dependencies);
    })().catch((error: unknown) => {
        // A transient failure (e.g. the database briefly unreachable) must
        // not poison the isolate; the next request retries initialization.
        appPromise = null;
        throw error;
    });
    return appPromise;
};

export default {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
        const app = await getApp(env);
        return app.fetch(request);
    }
};
