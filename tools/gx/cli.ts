#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import prettyCli from '@tryghost/pretty-cli';
import { runGhostCommand } from './run-ghost-command.ts';

const args = process.argv.slice(2);
let commandRun = false;
const cli = prettyCli.Api.get({ name: 'pnpm gx' })
  .help('-h, --help')
  .style(prettyCli.styles)
  .preface('Ghost Dev Tools')
  .strict();

cli.command({
  flags: 'generate',
  desc: 'Generate a package, golden-email or migration.',
  setup(group) {
    group.command({
      flags: 'package',
      desc: 'Scaffold an internal workspace package.',
      async run() {
        commandRun = true;
        // Keep the existing generator's argument parser and exit behavior.
        process.argv = [...process.argv.slice(0, 2), ...args.slice(2)];
        await import('./create-package.ts');
      },
    });
    for (const command of [
      {
        flags: 'golden-email',
        desc: 'Render the golden email.',
        file: './generate-golden-email.ts',
      },
      { flags: 'migration', desc: 'Scaffold a database migration.', file: './create-migration.ts' },
    ]) {
      group.command({
        flags: command.flags,
        desc: command.desc,
        run() {
          commandRun = true;
          const file = fileURLToPath(new URL(command.file, import.meta.url));
          const result = spawnSync(process.execPath, [file, ...args.slice(2)], {
            stdio: 'inherit',
          });
          if (result.error) {
            throw result.error;
          }
          process.exitCode = result.status ?? 1;
        },
      });
    }
  },
});

cli.command({
  flags: 'dev',
  desc: 'Start, stop, inspect and clean up development stacks.',
  setup(group) {
    for (const command of [
      { flags: 'up', desc: 'Start this checkout in the background.' },
      { flags: 'down', desc: 'Stop development stacks and orphaned processes.' },
      { flags: 'status', desc: 'Inspect development stacks.' },
      { flags: 'gc', desc: 'Inspect or remove unused development resources.' },
    ]) {
      group.command({
        flags: command.flags,
        desc: command.desc,
        async run() {
          commandRun = true;
          process.argv = [...process.argv.slice(0, 2), ...args.slice(2)];
          await import(`./dev-${command.flags}.ts`);
        },
      });
    }
  },
});

cli.command({
  flags: 'services',
  desc: 'Inspect service migration and dependency work.',
  setup(group) {
    for (const command of [
      { flags: 'list', desc: 'List services with migration categories and dependency counts.' },
      { flags: 'report', desc: 'Show migration totals or details for one service.' },
      { flags: 'dependencies', desc: 'Rank disallowed dependencies by importing files.' },
      { flags: 'audit', desc: 'Use Dependency Cruiser’s native dependency reports.' },
    ]) {
      group.command({
        ...command,
        async run() {
          commandRun = true;
          const { runServices } = await import('./services.ts');
          runServices(command.flags, args.slice(2));
        },
      });
    }
  },
});

cli.command({
  flags: 'db',
  desc: 'Development database tools.',
  setup(group) {
    group.command({
      flags: 'rebuild-development-tables',
      desc: 'Drop and recreate development-only tables.',
      run() {
        commandRun = true;
        runGhostCommand('./rebuild-in-development-tables.ts', args.slice(2));
      },
    });
  },
});

cli.command({
  flags: 'data',
  desc: 'Generate development data and verification scenarios.',
  setup(group) {
    for (const command of [
      { flags: 'generate', desc: 'Generate a development dataset.', file: './generate-data.ts' },
      {
        flags: 'shift-dates',
        desc: 'Shift database dates for testing.',
        file: './shift-dates.ts',
      },
      {
        flags: 'multi-sub-scenarios',
        desc: 'Seed multi-subscription scenarios.',
        file: './multi-sub-scenarios.ts',
      },
    ]) {
      group.command({
        flags: command.flags,
        desc: command.desc,
        run() {
          commandRun = true;
          runGhostCommand(command.file, args.slice(2), true);
        },
      });
    }
  },
});

cli.command({
  flags: 'benchmark',
  desc: 'Run development benchmarks.',
  setup(group) {
    group.command({
      flags: 'recipient-preparation',
      desc: 'Measure email recipient preparation with synthetic members.',
      run() {
        commandRun = true;
        runGhostCommand('./benchmark-recipient-preparation.ts', args.slice(2), true, [
          '--expose-gc',
        ]);
      },
    });
  },
});

cli.command({
  flags: 'webhooks',
  desc: 'Development webhook tools.',
  setup(group) {
    group.command({
      flags: 'server',
      desc: 'Receive webhooks and show them in a browser.',
      run() {
        commandRun = true;
        const file = fileURLToPath(new URL('./webhook-server.ts', import.meta.url));
        const result = spawnSync(process.execPath, [file, ...args.slice(2)], {
          stdio: 'inherit',
        });
        if (result.error) {
          throw result.error;
        }
        process.exitCode = result.status ?? 1;
      },
    });
  },
});

cli.command({
  flags: 'repl',
  desc: 'Open a REPL with Ghost models and database access.',
  run() {
    commandRun = true;
    runGhostCommand('./repl.ts', args.slice(1), true);
  },
});

// Parse only the command path; tool arguments and help flags pass through untouched.
const rootHelp =
  args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0] ?? ''));
const result = await cli.parse(rootHelp ? ['--help'] : args.slice(0, args[0] === 'repl' ? 1 : 2));
if (!commandRun) {
  process.exitCode = rootHelp ? result.code : result.code || 1;
  const output = result.output || cli.getHelp();
  const stream = process.exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${output}\n`);
} else if (result.code !== 0) {
  process.exitCode = result.code;
  process.stderr.write(`${result.output}\n`);
}
