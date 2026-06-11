// Cloudflare Workers entry point (decision #13: Workers-first runtime).
// Static files come from the wrangler assets binding (staged by
// `yarn worker:assets`), theme bundles are compiled into the worker bundle
// (no runtime code evaluation), and configuration arrives through worker
// vars, which the nodejs_compat flag mirrors onto process.env.
import {createApp} from './app/app.js';
import {createAppDependencies} from './app/bootstrap.js';
import {createWorkersFileStore} from './platform/files/workers.js';
import {createStaticThemeBundles} from './frontend/themes/bundles.js';
import casperBundle from '../content/themes/casper/bundle.mjs';
import sourceBundle from '../content/themes/source/bundle.mjs';

type WorkerEnv = {
    ASSETS: {fetch: (request: Request | URL) => Promise<Response>};
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
            })
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
