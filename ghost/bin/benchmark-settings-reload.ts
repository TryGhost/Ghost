#!/usr/bin/env node

import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

interface Options {
  runs: number;
  warmup: number;
  timeoutMs: number;
}

interface ReloadResult {
  status: 'ok' | 'error' | 'observation-limit';
  findAllMs?: number;
  rebuildMs?: number;
  rows?: number;
  phase?: 'findAll' | 'rebuild';
  errorName?: string;
  errorCode?: string;
}

interface Sample extends ReloadResult {
  warmup: boolean;
  elapsedMs: number;
}

function errorDetails(error: unknown): Pick<ReloadResult, 'errorName' | 'errorCode'> {
  const detail = error as { name?: unknown; code?: unknown } | null;
  const safeName = (value: unknown) =>
    typeof value === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(value) ? value : undefined;
  // Driver messages and SQL can contain setting values or connection details.
  return { errorName: safeName(detail?.name), errorCode: safeName(detail?.code) };
}

export function parseOptions(args: string[]): Options & { output: string } {
  const { values } = parseArgs({
    args,
    options: {
      output: { type: 'string' },
      runs: { type: 'string', default: '1000' },
      warmup: { type: 'string', default: '20' },
      'timeout-ms': { type: 'string', default: '120000' },
    },
  });
  const integer = (name: string, value: string, min: number, max: number) => {
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < min || number > max) {
      throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return number;
  };
  if (!values.output) {
    throw new Error('--output is required');
  }
  return {
    output: values.output,
    runs: integer('--runs', values.runs, 1, 100000),
    warmup: integer('--warmup', values.warmup, 0, 10000),
    timeoutMs: integer('--timeout-ms', values['timeout-ms'], 1, 3600000),
  };
}

export async function benchmarkReload(reload: () => Promise<ReloadResult>, options: Options) {
  const samples: Sample[] = [];
  for (let index = 0; index < options.warmup + options.runs; index += 1) {
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: ReloadResult;
    try {
      result = await Promise.race([
        reload(),
        new Promise<ReloadResult>((resolve) => {
          timer = setTimeout(() => resolve({ status: 'observation-limit' }), options.timeoutMs);
        }),
      ]);
    } catch (error) {
      result = { status: 'error', ...errorDetails(error) };
    } finally {
      clearTimeout(timer);
    }
    samples.push({
      ...result,
      warmup: index < options.warmup,
      elapsedMs: performance.now() - start,
    });
    // A pending operation must never overlap another sample. Errors are not retried by this tool.
    if (result.status !== 'ok') {
      break;
    }
  }
  const durations = samples
    .filter((sample) => !sample.warmup && sample.status === 'ok')
    .map((sample) => sample.elapsedMs)
    .sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    durations.length ? durations[Math.ceil(durations.length * fraction) - 1] : null;
  return {
    summary: { successfulRuns: durations.length, p50Ms: percentile(0.5), p99Ms: percentile(0.99) },
    samples,
  };
}

export function createSettingsReload(): () => Promise<ReloadResult> {
  require('../core/server/overrides');
  const config = require('../core/shared/config');
  const events = require('../core/server/lib/common/events');
  const models = require('../core/server/models');
  const settingsService = require('../core/server/services/settings');
  const settingsCache = require('../core/shared/settings-cache');
  const adapterManager = require('../core/server/services/adapter-manager').default;
  const cacheStore = adapterManager.getAdapter('cache:settings');

  return async () => {
    let phase: 'findAll' | 'rebuild' = 'findAll';
    const start = performance.now();
    try {
      const collection = await models.Settings.findAll({ context: { internal: true } });
      const fetched = performance.now();
      phase = 'rebuild';
      // Mirror init's overrides without its database writes (defaults and access limits).
      const overrides = { ...(config.get('hostSettings:settingsOverrides') || {}) };
      if (config.get('hostSettings:limits:customIntegrations:disabled') === true) {
        overrides.transistor = false;
      }
      settingsCache.init(
        events,
        collection,
        settingsService.getCalculatedFields(),
        cacheStore,
        overrides,
      );
      const rebuilt = performance.now();
      return {
        status: 'ok',
        findAllMs: fetched - start,
        rebuildMs: rebuilt - fetched,
        rows: collection.models.length,
      };
    } catch (error) {
      return { status: 'error', phase, ...errorDetails(error) };
    }
  };
}

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(
      'Usage: node bin/benchmark-settings-reload.js --output <new-file.json> [--runs 1000] [--warmup 20] [--timeout-ms 120000]',
    );
    return;
  }
  const options = parseOptions(process.argv.slice(2));
  const output = fs.openSync(options.output, 'wx', 0o600);
  // Core imports can create handles before setup fails. This is an isolated CLI, never a serving process.
  let exitCode = 1;
  try {
    const reload = createSettingsReload();
    await require('../core/server/services/limits').init();
    const result = await benchmarkReload(reload, options);
    fs.writeFileSync(
      output,
      JSON.stringify(
        {
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          ghostVersion: require('../package.json').version,
          nodeVersion: process.version,
          options: { runs: options.runs, warmup: options.warmup, timeoutMs: options.timeoutMs },
          ...result,
        },
        null,
        2,
      ) + '\n',
    );
    exitCode = result.samples.some((sample) => sample.status === 'observation-limit')
      ? 2
      : result.samples.some((sample) => sample.status === 'error')
        ? 1
        : 0;
  } catch (error) {
    fs.writeFileSync(
      output,
      JSON.stringify({ schemaVersion: 1, status: 'setup-error', ...errorDetails(error) }, null, 2) +
        '\n',
    );
  } finally {
    fs.closeSync(output);
    // An observation limit does not cancel the driver query; bound cleanup as well.
    const cleanupDeadline = setTimeout(() => process.exit(exitCode), 1000);
    try {
      const { knex } = require('../core/server/data/db');
      await knex?.destroy();
    } finally {
      clearTimeout(cleanupDeadline);
      process.exit(exitCode);
    }
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Benchmark could not start:', errorDetails(error));
    process.exitCode = 1;
  });
}
