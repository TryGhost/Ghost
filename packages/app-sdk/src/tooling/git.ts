import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { ignoreError } from '../shared/ignore.ts';

export type IgnoredResult = { ignored: true } | { ignored: false; reason: string };

function git(args: string[], cwd: string, input?: string) {
  return new Promise<{ code: number | string | null; stdout: string; stderr: string }>((done) => {
    const child = execFile('git', args, { cwd }, (error, stdout, stderr) => {
      done({ code: error ? ((error as { code?: number | string }).code ?? 1) : 0, stdout, stderr });
    });
    // A git that couldn't start has no stdin to write to; its error arrives above.
    child.stdin?.on('error', ignoreError);
    child.stdin?.end(input);
  });
}

function insideRepository(directory: string): boolean {
  for (let current = resolve(directory); ; current = dirname(current)) {
    if (existsSync(join(current, '.git'))) {
      return true;
    }
    if (dirname(current) === current) {
      return false;
    }
  }
}

/**
 * The directory itself, or the nearest one above it that exists, to run git in: a project's
 * directory may not exist before its keys are written, and git can't start in one that doesn't.
 */
function existingDirectory(directory: string): string {
  let current = resolve(directory);
  while (!existsSync(current) && dirname(current) !== current) {
    current = dirname(current);
  }
  return current;
}

/**
 * Whether git ignores every one of `files`, which needn't exist yet, so none can be committed by
 * accident. A file outside any repository counts as ignored.
 */
export async function isGitIgnored(
  root: string,
  files: string | readonly string[],
): Promise<IgnoredResult> {
  // git can't start in a directory that doesn't exist, and a project's may not exist yet.
  const cwd = existingDirectory(root);
  const paths = (typeof files === 'string' ? [files] : files).map((file) => ({
    // As the developer named it, for messages, and as git is asked about it, from `cwd`.
    shown: relative(root, resolve(root, file)),
    asked: relative(cwd, resolve(root, file)),
  }));
  const named = `${paths.map(({ shown }) => shown).join(' and ')} ${paths.length > 1 ? 'are' : 'is'}`;

  const repository = await findRepository(cwd, named);
  if (repository !== 'inside') {
    return repository === 'outside' ? { ignored: true } : repository;
  }
  return askWhichAreIgnored(cwd, paths, named);
}

/** Whether `cwd` is in a repository, or why git can't say when it seems to be. */
async function findRepository(
  cwd: string,
  named: string,
): Promise<'inside' | 'outside' | { ignored: false; reason: string }> {
  // Read from what git exits with, never from what it says, which is in the developer's
  // language. A `.git` that git can't read is still a repository, so it isn't taken as outside.
  const inside = await git(['rev-parse', '--is-inside-work-tree'], cwd);
  if (inside.code === 0) {
    return 'inside';
  }
  if (!insideRepository(cwd)) {
    return 'outside';
  }
  return {
    ignored: false,
    reason:
      inside.code === 'ENOENT'
        ? `git isn't installed, so it can't check ${named} ignored`
        : `git couldn't read the repository: ${inside.stderr.trim()}`,
  };
}

async function askWhichAreIgnored(
  cwd: string,
  paths: { shown: string; asked: string }[],
  named: string,
): Promise<IgnoredResult> {
  // One call for every path. It lists the ones it ignores, and exits with 1 when it ignores none.
  // Paths go in and out separated by NUL, as git would otherwise quote one with any byte outside
  // ASCII. A file git tracks isn't ignored, even if a `.gitignore` names it.
  const { code, stdout, stderr } = await git(
    ['check-ignore', '--stdin', '-z'],
    cwd,
    paths.map(({ asked }) => `${asked}\0`).join(''),
  );
  if (code !== 0 && code !== 1) {
    return { ignored: false, reason: `git couldn't check ${named} ignored: ${stderr.trim()}` };
  }
  const ignored = new Set(stdout.split('\0'));
  const notIgnored = paths.find(({ asked }) => !ignored.has(asked));
  return notIgnored
    ? { ignored: false, reason: `git doesn't ignore ${notIgnored.shown}` }
    : { ignored: true };
}
