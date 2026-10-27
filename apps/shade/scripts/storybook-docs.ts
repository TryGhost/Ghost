/// <reference types="node" />
/* eslint-disable no-console -- Storybook's terminal and the CLI are the UI for docs build errors */

/**
 * Serves Shade's Markdown docs from Storybook, for agents to read with `curl`:
 * `/docs/<path>.md` and `/llms.txt`.
 *
 * `.storybook/main.tsx` generates them into `.storybook-docs/` before Storybook
 * resolves its `staticDirs`, so `storybook dev` serves them and `storybook build`
 * copies them into the static output. In dev, `storybookDocsPlugin()` rebuilds
 * them when an `.mdx` or stories file under `src/` changes.
 *
 * Run directly (`pnpm build:docs`), it writes `.storybook-docs/` without Storybook.
 */

import { mkdirSync } from 'node:fs';
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { DocsBuildError, writeStorybookDocs } from './build-docs.ts';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(PACKAGE_ROOT, 'src');
const DEBOUNCE_MS = 100;

/** Generated; gitignored. Its contents are served from the Storybook root. */
export const STORYBOOK_DOCS_DIR = join(PACKAGE_ROOT, '.storybook-docs');

/** Files whose edits can change the generated docs: the `.mdx` sources and the stories a `<Canvas>` shows. */
export function affectsDocs(file: string): boolean {
  const path = relative(SRC_DIR, file);
  return (
    !path.startsWith('..') &&
    !path.split(sep).includes('node_modules') &&
    /\.(?:mdx|stories\.[jt]sx?)$/.test(path)
  );
}

/**
 * Writes `STORYBOOK_DOCS_DIR`. With `failOnError` a failed build throws;
 * otherwise it logs the error, keeps the last good docs and returns false.
 */
export async function generateStorybookDocs({
  failOnError,
}: {
  failOnError: boolean;
}): Promise<boolean> {
  try {
    const { docs, warnings } = await writeStorybookDocs(PACKAGE_ROOT, STORYBOOK_DOCS_DIR);
    for (const warning of warnings.filter((w) => w.kind === 'unresolved')) {
      console.warn(`Shade docs: ${warning.file}:${warning.line}: ${warning.message}`);
    }
    console.log(`Shade docs: generated ${docs.length} docs at /docs/ and /llms.txt.`);
    return true;
  } catch (error) {
    if (failOnError) {
      throw error;
    }
    const message = error instanceof DocsBuildError ? error.message : String(error);
    console.error(
      `Shade docs: building the Markdown docs failed; serving the last good copy.\n${message}`,
    );
    // Storybook refuses a static dir that doesn't exist.
    mkdirSync(STORYBOOK_DOCS_DIR, { recursive: true });
    return false;
  }
}

const isServedDoc = (path: string): boolean =>
  path === '/llms.txt' || /^\/docs\/.+\.md$/.test(path);

const withCharset = <T>(type: T): T | string =>
  typeof type === 'string' && /^text\/(?:markdown|plain)$/i.test(type.trim())
    ? `${type}; charset=utf-8`
    : type;

/**
 * Dev-server middleware that adds `charset=utf-8` to the served docs' content
 * type, so browsers show characters like "→" correctly. It must run before
 * Storybook's static file handler, which writes the header in `writeHead`.
 */
export function utf8DocsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  if (isServedDoc((req.url ?? '').split('?')[0]!)) {
    const writeHead = res.writeHead;
    res.writeHead = function (this: ServerResponse, ...args: unknown[]) {
      const current = res.getHeader('Content-Type');
      if (current !== undefined) {
        res.setHeader('Content-Type', withCharset(current) as string);
      }
      for (const arg of args) {
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
          const headers = arg as OutgoingHttpHeaders;
          for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === 'content-type') {
              headers[key] = withCharset(headers[key]);
            }
          }
        }
      }
      return (writeHead as (...a: unknown[]) => ServerResponse).apply(this, args);
    } as typeof res.writeHead;
  }
  next();
}

/** Dev-only Vite plugin: rebuilds the served docs when a docs source changes. */
export function storybookDocsPlugin(): Plugin {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<unknown> = Promise.resolve();

  const schedule = (file: string): void => {
    if (!affectsDocs(file)) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      running = running.then(() => generateStorybookDocs({ failOnError: false }));
    }, DEBOUNCE_MS);
  };

  return {
    name: 'shade-storybook-docs',
    apply: 'serve',
    config: () => ({
      server: { watch: { ignored: [`${STORYBOOK_DOCS_DIR}/**`] } },
    }),
    configureServer(server) {
      server.watcher.add(SRC_DIR);
      for (const event of ['add', 'change', 'unlink'] as const) {
        server.watcher.on(event, schedule);
      }
    },
  };
}

if (import.meta.main) {
  try {
    await generateStorybookDocs({ failOnError: true });
  } catch (error) {
    if (!(error instanceof DocsBuildError)) {
      throw error;
    }
    console.error(`Building Shade's Markdown docs failed:\n${error.message}`);
    process.exit(1);
  }
}
