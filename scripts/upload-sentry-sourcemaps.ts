import { parseArgs } from 'node:util';

import { createSentryBuildPluginManager } from '@sentry/bundler-plugin-core';

// Uploads sourcemaps for bundles the Sentry vite plugin already tagged with
// debug IDs (`sourcemaps.disable: 'disable-upload'`). Runs after the build so a
// slow or unavailable Sentry can't hold it up. Org, project and token come
// from SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN.

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    release: { type: 'string' },
  },
});

if (positionals.length === 0) {
  console.error('Usage: node scripts/upload-sentry-sourcemaps.ts [--release <name>] <dist-dir>...');
  process.exit(1);
}

const manager = createSentryBuildPluginManager(
  {
    release: { name: values.release, inject: false },
    sourcemaps: { assets: positionals.map((dir) => `${dir}/**/*.js`) },
    telemetry: false,
    // Keep going, but fail the step so a missed upload is visible
    errorHandler: (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  },
  { buildTool: 'vite', loggerPrefix: '[sentry-upload]' },
);

await manager.createRelease();
await manager.uploadSourcemaps([]);
