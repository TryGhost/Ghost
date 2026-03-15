#!/usr/bin/env node

const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// App configurations - now only need paths, colors, and nx project names
const apps = {
    shade: { path: 'apps/shade', color: colors.white, nxName: '@tryghost/shade' },
    design: { path: 'apps/admin-x-design-system', color: colors.cyan, nxName: '@tryghost/admin-x-design-system' },
    framework: { path: 'apps/admin-x-framework', color: colors.magenta, nxName: '@tryghost/admin-x-framework' },
    activitypub: { path: 'apps/admin-x-activitypub', color: colors.red, nxName: '@tryghost/admin-x-activitypub' },
    settings: { path: 'apps/admin-x-settings', color: colors.green, nxName: '@tryghost/admin-x-settings' },
    posts: { path: 'apps/posts', color: colors.yellow, nxName: '@tryghost/posts' },
    stats: { path: 'apps/stats', color: colors.blue, nxName: '@tryghost/stats' }
};

// Track all child processes and watchers for cleanup
const activeProcesses = new Set();
const activeWatchers = new Set();

function log(appName, message) {
    const app = apps[appName];
    console.log(`${app.color}[${appName}]${colors.reset} ${message}`);
}

function buildAllProjects(triggerApp) {
    return new Promise((resolve) => {
        log(triggerApp, 'Running nx run-many to rebuild all projects...');
        const allProjects = Object.values(apps).map(app => app.nxName).join(',');

        const child = spawn('yarn', ['nx', 'run-many', '-t', 'build', `--projects=${allProjects}`], {
            cwd: '/home/ghost',
            stdio: 'pipe',
            env: {
                ...process.env,
                NX_DAEMON: 'false'
            }
        });

        activeProcesses.add(child);

        child.stdout.on('data', (data) => {
            data.toString().split('\n').forEach(line => {
                if (line.trim()) log(triggerApp, `nx: ${line}`);
            });
        });

        child.stderr.on('data', (data) => {
            data.toString().split('\n').forEach(line => {
                if (line.trim()) log(triggerApp, `nx: ${line}`);
            });
        });

        child.on('close', (code) => {
            activeProcesses.delete(child);
            if (code === 0) {
                log(triggerApp, 'All builds complete');
            } else {
                log(triggerApp, `Some builds failed with code ${code}`);
            }
            resolve();
        });

        child.on('error', (error) => {
            activeProcesses.delete(child);
            log(triggerApp, `Build error: ${error.message}`);
            resolve();
        });
    });
}

function startWatching() {
    const watchPaths = Object.values(apps).map(app => path.join('/home/ghost', app.path, 'src'));

    console.log('Watching all project src folders for changes...');

    const watcher = chokidar.watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 1000
    });

    // Track the watcher for cleanup
    activeWatchers.add(watcher);

    let rebuildTimer;

    watcher.on('all', (event, filePath) => {
        const relativePath = path.relative('/home/ghost', filePath);

        // Find which project changed for better logging
        const changedProject = Object.keys(apps).find(name =>
            filePath.includes(apps[name].path)
        ) || 'unknown';

        log(changedProject, `Change detected: ${event} ${relativePath}`);

        // Debounce rebuilds
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(async () => {
            await buildAllProjects(changedProject);
        }, 500);
    });

    watcher.on('error', (error) => {
        console.log(`Watcher error: ${error.message}`);
        console.log('Exiting process - Docker will restart the service');
        process.exit(1);
    });

    watcher.on('close', () => {
        console.log('Watcher closed unexpectedly');
        console.log('Exiting process - Docker will restart the service');
        process.exit(1);
    });

    return watcher;
}

async function main() {
    console.log('Starting admin apps build and watch system...');

    try {
        // Phase 1: Build everything with nx handling dependency order and parallelization
        const allProjects = Object.values(apps).map(app => app.nxName).join(',');

        const child = spawn('yarn', ['nx', 'run-many', '-t', 'build', `--projects=${allProjects}`], {
            cwd: '/home/ghost',
            stdio: 'pipe',
            env: {
                ...process.env,
                NX_DAEMON: 'false'
            }
        });

        activeProcesses.add(child);

        child.stdout.on('data', (data) => {
            data.toString().split('\n').forEach(line => {
                if (line.trim()) console.log(`[nx] ${line}`);
            });
        });

        child.stderr.on('data', (data) => {
            data.toString().split('\n').forEach(line => {
                if (line.trim()) console.log(`[nx] ${line}`);
            });
        });

        await new Promise((resolve, reject) => {
            child.on('close', (code) => {
                activeProcesses.delete(child);
                if (code === 0) {
                    console.log('\nAll projects built successfully!');
                    resolve();
                } else {
                    console.log(`\nSome builds failed, but continuing with watch processes...`);
                    resolve(); // Don't crash the watch system if some builds fail
                }
            });

            child.on('error', (error) => {
                activeProcesses.delete(child);
                reject(error);
            });
        });

        // Phase 2: Start single watcher for all projects
        // Single watcher for all projects - any change triggers nx run-many (with caching)
        const watcher = startWatching();

        console.log('\nAll watch processes started. Press Ctrl+C to stop.');

        // Keep the process alive
        await new Promise(() => { });

    } catch (error) {
        console.error('Failed to start:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown handler
function cleanup() {
    console.log('\nShutting down...');

    // Kill all active child processes
    for (const child of activeProcesses) {
        try {
            child.kill('SIGTERM');
            // Force kill after 1 second if still running
            setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGKILL');
                }
            }, 1000);
        } catch (error) {
            // Process might already be dead
        }
    }

    // Close all watchers
    for (const watcher of activeWatchers) {
        try {
            watcher.close();
        } catch (error) {
            // Watcher might already be closed
        }
    }

    console.log('Cleanup complete.');
    process.exit(0);
}

// Handle various termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGQUIT', cleanup);

// Handle uncaught exceptions to ensure cleanup
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    cleanup();
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    cleanup();
});

main();
