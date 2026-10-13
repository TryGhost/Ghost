// NOTE: this file can't use any NPM dependencies because it needs to run even if dependencies aren't installed yet or are corrupted
import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function deleteBuildArtifacts() {
  console.log('Deleting all build artifacts...');
  try {
    execSync('find ./ghost -type d -name "build" -exec rm -rf \'{}\' +', {
      stdio: 'inherit',
    });
    execSync('find ./ghost -type f -name "tsconfig.tsbuildinfo" -delete', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to delete build artifacts:', error);
    process.exit(1);
  }
}

// Other checkouts' worktrees inside this one, e.g. Claude Code's .claude/worktrees
function nestedWorktrees() {
  try {
    const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
    const root = git('rev-parse', '--show-toplevel');
    return git('worktree', 'list', '--porcelain')
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length))
      .filter((path) => path.startsWith(`${root}/`))
      .map((path) => `.${path.slice(root.length)}`);
  } catch {
    // Outside a git checkout there are no worktrees
    return [];
  }
}

function deleteNodeModules() {
  console.log('Deleting all node_modules directories...');
  try {
    const skip = nestedWorktrees().flatMap((path) => ['-path', path, '-prune', '-o']);
    const nodeModules = ['-name', 'node_modules', '-type', 'd', '-prune'];
    execFileSync('find', ['.', ...skip, ...nodeModules, '-exec', 'rm', '-rf', '{}', '+'], {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to delete node_modules directories:', error);
    process.exit(1);
  }
}

function resetNxCache() {
  console.log('Resetting NX cache...');
  // Nx keeps its local cache in ~/.nx, shared by every checkout, so only nx can clear it
  if (existsSync('node_modules/.bin/nx')) {
    try {
      execSync('node_modules/.bin/nx reset', { stdio: 'inherit' });
    } catch {
      // A broken install can't run nx; the remaining cleanup still applies
    }
  }
  try {
    execSync('rm -rf .nxcache .nx');
  } catch (error) {
    console.error('Failed to reset NX cache:', error);
    process.exit(1);
  }
}

resetNxCache();
deleteNodeModules();
deleteBuildArtifacts();
console.log('Cleanup complete!');
