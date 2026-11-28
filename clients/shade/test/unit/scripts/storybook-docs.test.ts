/// <reference types="node" />
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { DocsBuildError } from '../../../scripts/build-docs';
import {
  affectsDocs,
  generateStorybookDocs,
  utf8DocsMiddleware,
} from '../../../scripts/storybook-docs';

/**
 * CI never builds Storybook, so these tests are what cover the docs Storybook
 * serves: they run the same `generateStorybookDocs` that `.storybook/main.tsx`
 * calls, against the real package, into a temporary folder.
 */

const packageRoot = join(import.meta.dirname, '../../..');

describe('generateStorybookDocs', () => {
  let outDir: string;
  let logError: Mock<(...args: unknown[]) => void>;

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'shade-storybook-docs-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    logError = vi.fn<(...args: unknown[]) => void>();
    vi.spyOn(console, 'error').mockImplementation(logError);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(outDir, { recursive: true, force: true });
  });

  it("writes Shade's docs and llms.txt", async () => {
    await expect(generateStorybookDocs({ failOnError: true, packageRoot, outDir })).resolves.toBe(
      true,
    );

    const llms = await readFile(join(outDir, 'llms.txt'), 'utf8');
    expect(llms).toMatch(/^# Shade\n/);
    expect(llms).toContain('(/docs/introduction.md)');
    expect(llms).toContain('(/docs/ghost-apps.md)');
    expect(llms).toContain('(/docs/components/patterns/page-header.md)');
    expect(await readFile(join(outDir, 'docs/index.md'), 'utf8')).toContain('# Shade docs');
    expect(await readFile(join(outDir, 'docs/tokens.md'), 'utf8')).toContain(
      'Generated from src/docs/tokens.mdx',
    );
  });

  describe('when the docs fail to build', () => {
    let brokenRoot: string;

    beforeEach(async () => {
      brokenRoot = await mkdtemp(join(tmpdir(), 'shade-broken-docs-'));
      await mkdir(join(brokenRoot, 'src/docs'), { recursive: true });
      await writeFile(
        join(brokenRoot, 'src/docs/broken.mdx'),
        '# Broken\n\nThe count is {count}.\n',
      );
    });

    afterEach(async () => {
      await rm(brokenRoot, { recursive: true, force: true });
    });

    it('throws for a static build', async () => {
      await expect(
        generateStorybookDocs({ failOnError: true, packageRoot: brokenRoot, outDir }),
      ).rejects.toBeInstanceOf(DocsBuildError);
    });

    it('logs and keeps a folder to serve in dev', async () => {
      const servedDir = join(outDir, 'not-yet-created');

      await expect(
        generateStorybookDocs({ failOnError: false, packageRoot: brokenRoot, outDir: servedDir }),
      ).resolves.toBe(false);
      expect(existsSync(servedDir)).toBe(true);
      expect(logError).toHaveBeenCalledWith(expect.stringMatching(/MDX expression/));
    });
  });
});

describe('affectsDocs', () => {
  it.each([
    ['src/docs/tokens.mdx', true],
    ['src/components/ui/button.stories.tsx', true],
    ['src/components/ui/button.tsx', false],
    ['README.md', false],
    ['.storybook-docs/docs/tokens.md', false],
  ])('%s → %s', (file, expected) => {
    expect(affectsDocs(join(packageRoot, file))).toBe(expected);
  });
});

describe('utf8DocsMiddleware', () => {
  const serve = (url: string, contentType: string): string | undefined => {
    const headers = new Map<string, string>([['content-type', contentType]]);
    const res = {
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
      writeHead: () => res,
    } as unknown as ServerResponse;
    const next = vi.fn();

    utf8DocsMiddleware({ url } as IncomingMessage, res, next);
    res.writeHead(200);

    expect(next).toHaveBeenCalledOnce();
    return headers.get('content-type');
  };

  it('adds a UTF-8 charset to the served docs', () => {
    expect(serve('/docs/tokens.md', 'text/markdown')).toBe('text/markdown; charset=utf-8');
    expect(serve('/llms.txt?x=1', 'text/plain')).toBe('text/plain; charset=utf-8');
  });

  it('leaves other files alone', () => {
    expect(serve('/index.html', 'text/html')).toBe('text/html');
    expect(serve('/docs/tokens.md', 'text/markdown; charset=utf-8')).toBe(
      'text/markdown; charset=utf-8',
    );
  });
});
