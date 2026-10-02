/**
 * Compile-time assertions for the schema-typed `config.get()`.
 *
 * Checked by `pnpm test:types`; there is nothing to run, so this is not a
 * `.test.ts`. Every `@ts-expect-error` below is the assertion - the build fails
 * if the error stops happening.
 */
import type { ConfigInstance } from '../../../../core/shared/config/loader';

declare const config: ConfigInstance;

// a key with a schema resolves to its real type
const url: string = config.get('url');
const env: string = config.get('env');

// a key with no schema keeps nconf's `any`, so existing call sites still compile
const contentPath: string = config.get('paths:contentPath');
const database: Record<string, unknown> = config.get('database');

// so does a key path built at runtime
declare const dynamic: string;
const fromDynamic: string = config.get(dynamic);

// ...and the whole tree
const whole: unknown = config.get();

// @ts-expect-error a schemafied key is not assignable to the wrong type
const wrongType: number = config.get('url');

// @ts-expect-error the validated view is deeply readonly, like the frozen object
config.validated.url = 'http://nope.test';

export { url, env, contentPath, database, fromDynamic, whole, wrongType };
