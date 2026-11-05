import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { Command, CommanderError } from 'commander';

import { checkApp } from './tooling/check.ts';
import {
  KEYS_DIRECTORY,
  KEY_NAMES,
  createKeys,
  keyFile,
  publicKeyOf,
  readBackendKey,
  type Mode,
} from './tooling/keys.ts';
import { canonicalPath, isWithin } from './tooling/paths.ts';
import { formatErrors } from './shared/manifest.ts';
import { MANIFEST_FILE, serialiseSigned, signProject } from './tooling/sign.ts';

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

const modeOf = (production: boolean | undefined): Mode =>
  production ? 'production' : 'development';

async function keys(root: string, mode: Mode, io: Io) {
  const { created, kept } = await createKeys({ root, mode });
  for (const name of created) {
    io.err(`Created ${keyFile(mode, name)}`);
  }
  for (const name of kept) {
    io.err(`Kept ${keyFile(mode, name)}, which already exists`);
  }
  if (mode === 'production' && created.includes('identity')) {
    io.err(
      '\nKeep a copy of the production identity key somewhere safe, such as a password manager. ' +
        'Sites that install the app keep its identity key, and an app signed with another key is another app.',
    );
  }
}

const MODES: readonly Mode[] = ['development', 'production'];

/** Throws if writing to `written` would overwrite the manifest it's signed from, or a key. */
function refuseToOverwrite(root: string, written: string, manifestFile: string) {
  // Where the write would really land, through every link.
  const lands = canonicalPath(written);
  if (lands === canonicalPath(resolve(root, manifestFile))) {
    throw new Error(
      `Refusing to write the signed manifest over ${manifestFile}, which it's signed from`,
    );
  }
  // Refused by the path as written, by where it really lands, and by where each key really is,
  // so neither a link out of .ghost-app/ nor a key that is itself a link lets it reach a key.
  const keysDirectory = join(root, KEYS_DIRECTORY);
  const keyFiles = MODES.flatMap((mode) =>
    KEY_NAMES.map((name) => canonicalPath(join(root, keyFile(mode, name)))),
  );
  if (
    isWithin(keysDirectory, written) ||
    isWithin(canonicalPath(keysDirectory), lands) ||
    keyFiles.includes(lands)
  ) {
    throw new Error(
      `Refusing to write the signed manifest into ${KEYS_DIRECTORY}/, which holds the keys`,
    );
  }
}

async function sign(
  root: string,
  {
    url,
    production,
    out,
    manifest,
  }: { url: string; production?: boolean; out?: string; manifest?: string },
  io: Io,
) {
  const manifestFile = manifest ?? MANIFEST_FILE;
  // Against the project's directory, like --manifest and the keys.
  const written = out === undefined ? undefined : resolve(root, out);
  if (written) {
    refuseToOverwrite(root, written, manifestFile);
  }
  const result = await signProject({
    root,
    mode: modeOf(production),
    manifestUrl: url,
    manifestFile,
  });
  if (!result.success) {
    io.err(`${result.code}: ${manifestFile} can't be signed:\n${formatErrors(result.errors)}`);
    return 1;
  }
  const text = serialiseSigned(result.signed);
  if (written) {
    await mkdir(dirname(written), { recursive: true });
    await writeFile(written, text);
    io.err(`Wrote ${written}, signed for ${String(result.manifest.manifest_url)}`);
  } else {
    io.out(text);
  }
  return 0;
}

async function check(url: string, io: Io) {
  const result = await checkApp(url);
  if (!result.success) {
    io.err(`${result.code}: ${result.message}`);
    io.err(result.errors ? formatErrors(result.errors) : result.detail);
    return 1;
  }
  const { manifest } = result;
  io.out(
    `OK: ${manifest.name} (${manifest.id}) at ${result.manifestUrl} is signed with the identity key it names, and its origin answered the challenge with its backend key.`,
  );
  if (manifest.development) {
    io.out('It is a development build, which Admin labels as one.');
  }
  return 0;
}

async function backendKey(
  root: string,
  {
    production,
    public: publicHalf,
    check: checkOnly,
  }: { production?: boolean; public?: boolean; check?: boolean },
  io: Io,
) {
  // Reading the key checks it, and fails with what's wrong, never with the key.
  const key = await readBackendKey({ root, mode: modeOf(production) });
  if (!checkOnly) {
    io.out(JSON.stringify(publicHalf ? publicKeyOf(key) : key));
  }
}

/** Runs the CLI with its arguments (without `node` and the script), resolving with the exit code. */
export async function run(args: string[], io: Io): Promise<number> {
  let exitCode = 0;
  const program = new Command('ghost-app')
    .description("Creates an app's keys, signs its manifest, and checks it as Ghost does.")
    .option('--dir <directory>', "the project's directory", '.')
    .showHelpAfterError()
    // Thrown rather than exiting, so `run` resolves with the code, and prints through `io`.
    .exitOverride()
    .configureOutput({ writeOut: io.out, writeErr: io.err });
  const root = () => resolve(program.opts<{ dir: string }>().dir);

  program
    .command('keys')
    .description(
      "Creates the mode's identity and backend keys in .ghost-app/, keeping any that exist",
    )
    .option('--production', 'the production keys instead of the development ones')
    .action(async ({ production }: { production?: boolean }) => {
      await keys(root(), modeOf(production), io);
    });

  program
    .command('sign')
    .description('Signs ghost-app.json for the address it will be served from')
    .requiredOption('--url <manifest URL>', 'the address the signed manifest will be served from')
    .option('--production', 'with the production keys instead of the development ones')
    .option('--out <file>', "write it to a file in the project's directory instead of printing it")
    .option('--manifest <file>', 'sign another file than ghost-app.json')
    .action(async (options: Parameters<typeof sign>[1]) => {
      exitCode = await sign(root(), options, io);
    });

  program
    .command('check')
    .description('Checks an app as Ghost does before installing it')
    .argument('<manifest URL>', 'the address of its signed manifest')
    .action(async (url: string) => {
      exitCode = await check(url, io);
    });

  program
    .command('backend-key')
    .description(
      "Prints the mode's private backend key, to pipe into a secret store: ghost-app backend-key --production --check && ghost-app backend-key --production | wrangler secret put GHOST_APP_BACKEND_KEY",
    )
    .option('--production', 'the production key instead of the development one')
    .option('--public', 'print only its public half, which is all CI needs to sign')
    .option('--check', 'print nothing, and exit 0 only if the key is there and usable')
    .action(async (options: Parameters<typeof backendKey>[1]) => {
      await backendKey(root(), options, io);
    });

  try {
    await program.parseAsync(args, { from: 'user' });
    return exitCode;
  } catch (error) {
    // Commander has already printed help, or the mistake and the help: 0 for asking for help,
    // and 2 for a mistake in how the CLI was called.
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? 0 : 2;
    }
    io.err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
