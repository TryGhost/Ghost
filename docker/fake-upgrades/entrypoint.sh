#!/bin/sh
set -eu

exec node --import tsx --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { FakeUpgradeHost } from './helpers/services/upgrade/fake-upgrade-host.ts';

const ghostVersion = JSON.parse(readFileSync('../ghost/package.json', 'utf8')).version.replace(/-.*$/, '');
const [major, minor] = ghostVersion.split('.').map(Number);
const settings = z
  .object({
    FAKE_UPGRADES_FROM: z.string().default(ghostVersion),
    FAKE_UPGRADES_TO: z.string().default(`${major}.${minor + 1}.0`),
    FAKE_UPGRADES_OUTCOME: z
      .enum(['done', 'restored', 'needs-operator', 'refused', 'interrupted'])
      .default('done'),
    FAKE_UPGRADES_AVAILABILITY: z.enum(['ready', 'busy', 'unavailable']).default('ready'),
    FAKE_UPGRADES_STAGE_MS: z.coerce.number().int().positive().default(3000),
    FAKE_UPGRADES_BACKUP: z.stringbool().default(true),
  })
  .parse(process.env);

const server = new FakeUpgradeHost({
  port: 4011,
  currentVersion: settings.FAKE_UPGRADES_FROM,
  targetVersion: settings.FAKE_UPGRADES_TO,
  outcome: settings.FAKE_UPGRADES_OUTCOME,
  availability: settings.FAKE_UPGRADES_AVAILABILITY,
  stageMs: settings.FAKE_UPGRADES_STAGE_MS,
  backupRequired: settings.FAKE_UPGRADES_BACKUP,
});
await server.start();
console.log(
  `Fake upgrade host listening on port 4011: Ghost ${settings.FAKE_UPGRADES_FROM} → ${settings.FAKE_UPGRADES_TO}, ending ${settings.FAKE_UPGRADES_OUTCOME}.`,
);

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
        await server.stop();
    });
}
JS
