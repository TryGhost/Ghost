import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { checkApp } from './tooling/check.ts';
import { createKeys, keyFile, readBackendKey, type Mode } from './tooling/keys.ts';
import { formatErrors } from './shared/manifest.ts';
import { MANIFEST_FILE, signProject } from './tooling/sign.ts';

const USAGE = `Usage: ghost-app <command> [options]

Commands:
  keys [--production]          Create the mode's identity and backend keys in .ghost-app/,
                               keeping any that exist
  sign --url <manifest URL>    Sign ghost-app.json for the address it will be served from
       [--production]          with the production keys instead of the development ones
       [--out <file>]          write it to a file instead of printing it
       [--manifest <file>]     sign another file than ghost-app.json
                               (both in the project's directory)
  check <manifest URL>         Check an app as Ghost does before installing it
  backend-key [--production]   Print the mode's private backend key, to pipe into a secret
                               store: ghost-app backend-key --production |
                               wrangler secret put GHOST_APP_BACKEND_KEY

Options:
  --dir <directory>            The project's directory (the current one by default)
  --help                       Show this help`;

/** Thrown for a mistake in how the CLI was called, which prints the usage. */
class UsageError extends Error {}

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

async function sign(
  root: string,
  {
    url,
    production,
    out,
    manifest,
  }: { url?: string; production?: boolean; out?: string; manifest?: string },
  io: Io,
) {
  if (!url) {
    throw new UsageError('sign needs --url, the address the signed manifest will be served from');
  }
  const result = await signProject({
    root,
    mode: modeOf(production),
    manifestUrl: url,
    manifestFile: manifest ?? MANIFEST_FILE,
  });
  if (!result.success) {
    io.err(
      `${result.code}: ${manifest ?? MANIFEST_FILE} can't be signed:\n${formatErrors(result.errors)}`,
    );
    return 1;
  }
  const text = `${JSON.stringify(result.signed, null, 2)}\n`;
  if (out) {
    // Against the project's directory, like --manifest and the keys.
    const written = resolve(root, out);
    await mkdir(dirname(written), { recursive: true });
    await writeFile(written, text);
    io.err(`Wrote ${written}, signed for ${String(result.manifest.manifest_url)}`);
  } else {
    io.out(text);
  }
  return 0;
}

async function check(url: string | undefined, io: Io) {
  if (!url) {
    throw new UsageError('check needs the manifest URL');
  }
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

async function backendKey(root: string, mode: Mode, io: Io) {
  io.out(JSON.stringify(await readBackendKey({ root, mode })));
}

/** Runs the CLI with its arguments (without `node` and the script), returning the exit code. */
export async function run(args: string[], io: Io): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        production: { type: 'boolean' },
        url: { type: 'string' },
        out: { type: 'string' },
        manifest: { type: 'string' },
        dir: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    io.err(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  const [command, ...rest] = positionals;
  if (values.help || !command) {
    (values.help ? io.out : io.err)(USAGE);
    return values.help ? 0 : 2;
  }
  const root = resolve(values.dir ?? '.');
  try {
    if (rest.length > (command === 'check' ? 1 : 0)) {
      throw new UsageError(`Unexpected ${rest.join(' ')}`);
    }
    switch (command) {
      case 'keys':
        await keys(root, modeOf(values.production), io);
        return 0;
      case 'sign':
        return await sign(root, values, io);
      case 'check':
        return await check(rest[0], io);
      case 'backend-key':
        await backendKey(root, modeOf(values.production), io);
        return 0;
      default:
        throw new UsageError(`Unknown command ${command}`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      io.err(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    io.err((error as Error).message);
    return 1;
  }
}
