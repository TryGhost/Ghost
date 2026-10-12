#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const commands = [
  {
    path: ['generate', 'package'],
    description: 'Create an internal TypeScript package from packages/_template.',
    usage: `Usage: pnpm gx generate package <name> [options]

  <name>                 Unscoped kebab-case name; becomes @tryghost/<name>.
  --dir <path>           Repository-relative destination (default: packages/<name>).
                         Ensure the workspace globs cover the destination.
  --description <text>   Package description.
  -h, --help             Show help.`,
    async run(args: string[], root: string) {
      const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: {
          dir: { type: 'string' },
          description: { type: 'string' },
          help: { type: 'boolean', short: 'h' },
        },
      });
      if (values.help) {
        return this.usage;
      }
      if (positionals.length !== 1) {
        throw new Error('Provide exactly one package name.');
      }
      const { generatePackage } = await import('./generate/package.ts');
      const directory = await generatePackage(root, {
        name: positionals[0]!,
        ...(values.dir === undefined ? {} : { directory: values.dir }),
        ...(values.description === undefined ? {} : { description: values.description }),
      });
      return `Created @tryghost/${positionals[0]} at ${directory} (ESM-only).

Next steps:
  1. pnpm install
  2. cd ${directory} && pnpm test
  3. Add real code in ${directory}/src/index.ts`;
    },
  },
];

interface CliOptions {
  root?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
}

export async function runCli(
  args: string[],
  {
    root = repositoryRoot,
    stdout = (text: string) => process.stdout.write(text),
    stderr = (text: string) => process.stderr.write(text),
  }: CliOptions = {},
): Promise<number> {
  try {
    const command = commands.find(({ path }) => path.every((part, index) => args[index] === part));
    if (command) {
      stdout(`${await command.run(args.slice(command.path.length), root)}\n`);
      return 0;
    }
    const group = args[0] === 'generate';
    const rest = group ? args.slice(1) : args;
    if (rest.length === 0 || (rest.length === 1 && ['--help', '-h'].includes(rest[0]!))) {
      stdout(
        `Ghost Dev Tools\n\nUsage: pnpm gx ${group ? 'generate <generator>' : '<command>'}\n\n${commands.map(({ path, description }) => `  ${path.slice(group ? 1 : 0).join(' ')}  ${description}`).join('\n')}\n`,
      );
      return 0;
    }
    throw new Error(`Unknown command: ${args.join(' ')}`);
  } catch (error) {
    stderr(
      `${error instanceof Error ? error.message : String(error)}\nRun pnpm gx --help for available commands.\n`,
    );
    return 1;
  }
}

if (import.meta.main) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
