import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { ROOT_DIR } from '../lib/constants.ts';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
};

// Pinned to the repo's pnpm so the fixture runs the same `[since]` filter.
const { packageManager } = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'));

export type FixtureFiles = Record<string, string | object>;

/**
 * A throwaway pnpm workspace in its own git repository, for tests that need
 * commit history pnpm can diff.
 */
export class WorkspaceFixture {
  readonly dir = mkdtempSync(join(tmpdir(), 'workspace-fixture-'));

  constructor(files: FixtureFiles) {
    this.git(['init', '--quiet', '--initial-branch', 'main', '.']);
    this.write({
      'package.json': { name: 'fixture-root', private: true, packageManager },
      ...files,
    });
  }

  git(args: string[]): string {
    return execFileSync('git', args, { cwd: this.dir, encoding: 'utf8', env: GIT_ENV }).trim();
  }

  /** Writes files relative to the fixture root; objects are written as JSON. */
  write(files: FixtureFiles): void {
    for (const [file, contents] of Object.entries(files)) {
      const path = join(this.dir, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(
        path,
        typeof contents === 'string' ? contents : `${JSON.stringify(contents, null, 2)}\n`,
      );
    }
  }

  /** Commits everything in the working tree and returns the new commit. */
  commit(message: string): string {
    this.git(['add', '--all']);
    this.git(['commit', '--quiet', '--allow-empty', '-m', message]);
    return this.git(['rev-parse', 'HEAD']);
  }

  /** Checks out `from` and commits `files` on top of it, leaving it checked out. */
  commitOn(from: string, files: FixtureFiles, message = 'change'): string {
    this.git(['checkout', '--quiet', '--detach', from]);
    this.write(files);
    return this.commit(message);
  }

  cleanup(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}
