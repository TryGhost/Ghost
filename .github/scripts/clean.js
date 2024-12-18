// NOTE: this file can't use any NPM dependencies because it needs to run even if dependencies aren't installed yet or are corrupted
const {execSync} = require('child_process');

const isDevContainer = process.env.DEVCONTAINER === 'true';

cleanYarnCache();
resetNxCache();
deleteNodeModules();
deleteBuildArtifacts();
console.log('Cleanup complete!');

function deleteBuildArtifacts() {
    console.log('Deleting all build artifacts...');
    try {
        execSync('find ./ghost -type d -name "build" -exec rm -rf \'{}\' +', {
            stdio: 'inherit'
        });
        execSync('find ./ghost -type f -name "tsconfig.tsbuildinfo" -delete', {
            stdio: 'inherit'
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
            stdio: 'inherit'
        });
    } catch (error) {
        console.error('Failed to delete node_modules directories:', error);
        process.exit(1);
    }
}

function resetNxCache() {
    console.log('Resetting NX cache...');
    try {
        execSync('rm -rf .nxcache .nx');
    } catch (error) {
        console.error('Failed to reset NX cache:', error);
        process.exit(1);
    }
}

function cleanYarnCache() {
    console.log('Cleaning yarn cache...');
    try {
        if (isDevContainer) {
            // In devcontainer, these directories are mounted from the host so we can't delete them — `yarn cache clean` will fail
            // so we delete the contents of the directories instead
            execSync('rm -rf .yarncache/* .yarncachecopy/*');
        } else {
            execSync('yarn cache clean');
        }
    } catch (error) {
        console.error('Failed to clean yarn cache:', error);
        process.exit(1);
    }
}
