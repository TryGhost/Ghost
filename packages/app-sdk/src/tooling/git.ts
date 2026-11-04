import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export type IgnoredResult = { ignored: true } | { ignored: false; reason: string };

function git(args: string[], cwd: string) {
  return new Promise<{ code: number | string | null; stdout: string; stderr: string }>((done) => {
    execFile('git', args, { cwd }, (error, stdout, stderr) => {
      done({ code: error ? ((error as { code?: number | string }).code ?? 1) : 0, stdout, stderr });
    });
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
 * Whether git ignores every one of `files` (which needn't exist yet), so none can be committed
 * by accident, asking git once. A file outside any repository counts as ignored. A file git
 * tracks isn't ignored, even if a `.gitignore` names it.
 */
export async function isGitIgnored(
  root: string,
  files: string | readonly string[],
): Promise<IgnoredResult> {
  const cwd = existingDirectory(root);
  const paths = (typeof files === 'string' ? [files] : files).map((file) => ({
    shown: relative(root, resolve(root, file)),
    asked: relative(cwd, resolve(root, file)),
  }));
  const named = `${paths.map(({ shown }) => shown).join(' and ')} ${paths.length > 1 ? 'are' : 'is'}`;
  // Whether there's a repository is read from what git exits with, never from what it says,
  // which is in the developer's language. A `.git` that git can't read is still a repository.
  const inside = await git(['rev-parse', '--is-inside-work-tree'], cwd);
  if (inside.code === 'ENOENT') {
    return insideRepository(cwd)
      ? { ignored: false, reason: `git isn't installed, so it can't check ${named} ignored` }
      : { ignored: true };
  }
  if (inside.code !== 0) {
    return insideRepository(cwd)
      ? { ignored: false, reason: `git couldn't read the repository: ${inside.stderr.trim()}` }
      : { ignored: true };
  }
  // Lists the paths it ignores, a line each as asked, and exits with 1 when it ignores none.
  const { code, stdout, stderr } = await git(
    ['check-ignore', '--', ...paths.map(({ asked }) => asked)],
    cwd,
  );
  if (code !== 0 && code !== 1) {
    return { ignored: false, reason: `git couldn't check ${named} ignored: ${stderr.trim()}` };
  }
  const ignored = new Set(stdout.split('\n'));
  const tracked = paths.find(({ asked }) => !ignored.has(asked));
  return tracked
    ? { ignored: false, reason: `git doesn't ignore ${tracked.shown}` }
    : { ignored: true };
}
