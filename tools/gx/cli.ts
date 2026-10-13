#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const usage =
  'Usage:\n  pnpm gx generate package <name> [options]\n  pnpm gx generate golden-email <segment> <output-path>\n  pnpm gx generate migration <slug>';

if (args[0] === 'generate' && args[1] === 'package') {
  // Forward the original generator's arguments and exit behavior unchanged.
  process.argv = [...process.argv.slice(0, 2), ...args.slice(2)];
  await import('./create-package.ts');
} else if (args[0] === 'generate' && ['golden-email', 'migration'].includes(args[1] ?? '')) {
  const command = fileURLToPath(
    new URL(
      args[1] === 'migration' ? './create-migration.ts' : './generate-golden-email.ts',
      import.meta.url,
    ),
  );
  const result = spawnSync(process.execPath, [command, ...args.slice(2)], { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
} else if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0] ?? ''))) {
  process.stdout.write(`Ghost Dev Tools\n\n${usage}\n`);
} else {
  process.stderr.write(`Unknown command: ${args.join(' ')}\n${usage}\n`);
  process.exitCode = 1;
}
