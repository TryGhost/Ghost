import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export type IgnoredResult = { ignored: true } | { ignored: false; reason: string };

function run(file: string, cwd: string) {
  return new Promise<{ code: number | string | null; stderr: string }>((done) => {
    execFile('git', ['check-ignore', '--quiet', '--', file], { cwd }, (error, _stdout, stderr) => {
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
  const { code, stderr } = await run(path, root);
  if (code === 0) {
    return { ignored: true };
  }
  if (code === 1) {
    return { ignored: false, reason: `git doesn't ignore ${path}` };
  }
  if (code === 'ENOENT') {
    return insideRepository(root)
      ? { ignored: false, reason: `git isn't installed, so it can't check ${path} is ignored` }
      : { ignored: true };
  }
  if (/not a git repository/i.test(stderr)) {
    return { ignored: true };
  }
  return { ignored: false, reason: `git couldn't check ${path} is ignored: ${stderr.trim()}` };
}
