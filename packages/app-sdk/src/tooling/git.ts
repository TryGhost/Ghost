import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export type IgnoredResult = { ignored: true } | { ignored: false; reason: string };

function git(args: string[], cwd: string) {
  return new Promise<{ code: number | string | null; stderr: string }>((done) => {
    execFile('git', args, { cwd }, (error, _stdout, stderr) => {
      done({ code: error ? ((error as { code?: number | string }).code ?? 1) : 0, stderr });
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
 * Whether git ignores `file` (which needn't exist yet), so it can't be committed by accident.
 * A file outside any repository counts as ignored. A file git tracks isn't ignored, even if a
 * `.gitignore` names it.
 */
export async function isGitIgnored(root: string, file: string): Promise<IgnoredResult> {
  const path = relative(root, resolve(root, file));
  // Whether there's a repository is read from what git exits with, never from what it says,
  // which is in the developer's language. A `.git` that git can't read is still a repository.
  const inside = await git(['rev-parse', '--is-inside-work-tree'], root);
  if (inside.code === 'ENOENT') {
    return insideRepository(root)
      ? { ignored: false, reason: `git isn't installed, so it can't check ${path} is ignored` }
      : { ignored: true };
  }
  if (inside.code !== 0) {
    return insideRepository(root)
      ? { ignored: false, reason: `git couldn't read the repository: ${inside.stderr.trim()}` }
      : { ignored: true };
  }
  const { code, stderr } = await git(['check-ignore', '--quiet', '--', path], root);
  if (code === 0) {
    return { ignored: true };
  }
  if (code === 1) {
    return { ignored: false, reason: `git doesn't ignore ${path}` };
  }
  return { ignored: false, reason: `git couldn't check ${path} is ignored: ${stderr.trim()}` };
}
