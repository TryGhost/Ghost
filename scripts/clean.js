// NOTE: this file can't use any NPM dependencies because it needs to run even if dependencies aren't installed yet or are corrupted
import { execSync } from 'node:child_process';
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

function deleteNodeModules() {
  console.log('Deleting all node_modules directories...');
  try {
    execSync('find . -name "node_modules" -type d -prune -exec rm -rf \'{}\' +', {
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
