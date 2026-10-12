#!/usr/bin/env node
const args = process.argv.slice(2);
const usage = 'Usage: pnpm gx generate package <name> [options]';

if (args[0] === 'generate' && args[1] === 'package') {
  // Forward the original generator's arguments and exit behavior unchanged.
  process.argv = [...process.argv.slice(0, 2), ...args.slice(2)];
  await import('./create-package.js');
} else if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) {
  process.stdout.write(`Ghost Dev Tools\n\n${usage}\n`);
} else {
  process.stderr.write(`Unknown command: ${args.join(' ')}\n${usage}\n`);
  process.exitCode = 1;
}
