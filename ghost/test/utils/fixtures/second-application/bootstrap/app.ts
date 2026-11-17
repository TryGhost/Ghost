import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApplication } from '../../../../../core/foundry/application';
import { createConfig, loadConfigSources } from '../../../../../core/foundry/config';
import { createLogger } from '../../../../../core/foundry/logging';
import type { ScheduledJob } from '../../../../../core/kernel/domains/domain-layer';
import { configSchema } from '../config/schema';

// A second application on the same framework: a lending desk, with its own
// config values and schema, its own logger options and its own domains. It
// supplies values and nothing else; everything it calls is the framework's.
// Nothing here, or in anything it imports, is Ghost's.

/** The jobs the domains asked to have scheduled, for a test to run. */
export const scheduled: ScheduledJob[] = [];

/** Builds the application. A function, so that a test can build a fresh one. */
export function createLendingDesk() {
  return createApplication({
    name: 'Lending desk',

    config: () =>
      createConfig(
        {
          ...loadConfigSources({
            env: 'testing',
            baseDir: path.join(__dirname, '../config'),
            customDir: path.join(__dirname, '../config/custom'),
            labels: { name: 'Lending desk config', owner: 'the lending desk' },
          }),
          env: 'testing',
        },
        { schema: configSchema, name: 'Lending desk config' },
      ),

    logging: (config) => {
      const { level, transports, path: configured } = config.validated.logging;
      return createLogger({
        name: 'lending-desk',
        domain: 'lending-desk',
        env: config.validated.env,
        level,
        transports,
        path: configured ?? mkdtempSync(path.join(tmpdir(), 'lending-desk-logs-')),
        rotation: { enabled: false },
      });
    },

    domains: {
      root: path.join(__dirname, '../../domains'),
      schedule: (job) => {
        scheduled.push(job);
      },
    },
  });
}
