#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stateDir = path.join(rootDir, '.ghost-dev');
const stateFile = path.join(stateDir, 'dev-supervisor.json');
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function ensureStateDir() {
    fs.mkdirSync(stateDir, {recursive: true});
}

function writeState(state) {
    ensureStateDir();
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function readState() {
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (error) {
        return null;
    }
}

function removeState() {
    try {
        fs.unlinkSync(stateFile);
    } catch (error) {
        // Nothing to remove.
    }
}

function processExists(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return false;
    }
}

function signalProcessGroup(pgid, signal) {
    if (process.platform === 'win32') {
        try {
            process.kill(pgid, signal);
            return true;
        } catch (error) {
            return false;
        }
    }

    try {
        process.kill(-pgid, signal);
        return true;
    } catch (error) {
        return false;
    }
}

function processGroupExists(pgid) {
    if (process.platform === 'win32') {
        return processExists(pgid);
    }

    try {
        process.kill(-pgid, 0);
        return true;
    } catch (error) {
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dockerComposeArgs() {
    const args = ['compose', '-f', 'compose.dev.yaml'];
    const extraComposeFiles = String(process.env.DEV_COMPOSE_FILES || '').trim();

    if (extraComposeFiles) {
        args.push(...extraComposeFiles.split(/\s+/));
    }

    return args;
}

function runDockerDown() {
    const result = spawnSync('docker', [...dockerComposeArgs(), 'down'], {
        cwd: rootDir,
        encoding: 'utf8',
        env: process.env,
        stdio: 'inherit'
    });

    return result.status === 0;
}

function printCommand(command, args, env) {
    const daemonMode = env.NX_DAEMON === 'false' ? 'disabled' : 'default';
    console.log(`[dev-supervisor] Starting: ${command} ${args.join(' ')}`);
    console.log(`[dev-supervisor] Nx daemon: ${daemonMode}`);
    if (env.NX_DAEMON === 'false') {
        console.log('[dev-supervisor] Set GHOST_DEV_NX_DAEMON=1 to compare with the daemon enabled.');
    }
}

function psOutput() {
    const result = spawnSync('ps', ['-axo', 'pid,ppid,pgid,stat,%cpu,%mem,etime,command'], {
        cwd: rootDir,
        encoding: 'utf8'
    });

    if (result.error) {
        return `Unable to run ps: ${result.error.message}\n`;
    }

    return result.stdout || '';
}

function printMatchingProcesses() {
    const repoPids = repoProcessIds();
    const patterns = [
        'pnpm .*dev',
        'nx',
        'vite',
        'ember',
        'nodemon',
        'concurrently',
        'tsc',
        'tailwind',
        'dev-supervisor'
    ];
    const matcher = new RegExp(patterns.join('|'), 'i');
    const lines = psOutput().split('\n').filter((line) => {
        const pid = Number(line.trim().split(/\s+/)[0]);
        return pid !== process.pid && pid !== process.ppid && repoPids.has(pid) && matcher.test(line);
    });

    if (!lines.length) {
        console.log('No matching Ghost repo-local dev processes found.');
        return;
    }

    console.log(lines.join('\n'));
}

function repoProcessIds() {
    const result = spawnSync('lsof', ['-nP', '-a', '-d', 'cwd'], {
        cwd: rootDir,
        encoding: 'utf8'
    });

    if (result.error || !result.stdout) {
        return new Set();
    }

    const pids = new Set();

    for (const line of result.stdout.split('\n').slice(1)) {
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[1]);
        const cwd = parts.slice(8).join(' ');

        if (pid && (cwd === rootDir || cwd.startsWith(`${rootDir}${path.sep}`))) {
            pids.add(pid);
        }
    }

    return pids;
}

function printNxDaemonStatus() {
    const result = spawnSync(pnpmBin, ['nx', 'daemon'], {
        cwd: rootDir,
        encoding: 'utf8',
        env: process.env
    });

    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    if (output) {
        console.log(output);
    } else if (result.error) {
        console.log(`Unable to inspect Nx daemon: ${result.error.message}`);
    }
}

async function cleanupHelper() {
    const pgidIndex = process.argv.indexOf('--pgid');
    const pgid = pgidIndex === -1 ? null : Number(process.argv[pgidIndex + 1]);

    if (!pgid) {
        process.exit(0);
    }

    await sleep(8000);

    if (processGroupExists(pgid)) {
        signalProcessGroup(pgid, 'SIGTERM');
    }

    runDockerDown();

    await sleep(3000);

    if (processGroupExists(pgid)) {
        signalProcessGroup(pgid, 'SIGKILL');
    }
}

function spawnCleanupHelper(pgid) {
    let helper;

    try {
        helper = spawn(process.execPath, [__filename, 'cleanup-helper', '--pgid', String(pgid)], {
            cwd: rootDir,
            detached: true,
            stdio: 'ignore'
        });
    } catch (error) {
        console.error(`[dev-supervisor] Failed to start cleanup helper: ${error.message}`);
        return;
    }

    helper.on('error', (error) => {
        console.error(`[dev-supervisor] Cleanup helper failed to start: ${error.message}`);
    });

    helper.unref();
}

function status() {
    const state = readState();

    console.log('Ghost dev supervisor');
    if (state) {
        const running = processExists(state.childPid);
        console.log(`State file: ${stateFile}`);
        console.log(`Started: ${state.startedAt}`);
        console.log(`Supervisor PID: ${state.supervisorPid}`);
        console.log(`Child PID/PGID: ${state.childPid}`);
        console.log(`Command: ${state.command} ${state.args.join(' ')}`);
        console.log(`Nx daemon for supervised dev: ${state.nxDaemon}`);
        console.log(`Child process running: ${running ? 'yes' : 'no'}`);
    } else {
        console.log(`State file: ${stateFile} (not present)`);
    }

    console.log('\nNx daemon');
    printNxDaemonStatus();

    console.log('\nMatching local dev processes');
    printMatchingProcesses();
}

function start() {
    const args = ['nx', 'run', 'ghost-monorepo:docker:dev'];
    const env = {
        ...process.env
    };

    if (!['1', 'true', 'yes'].includes(String(process.env.GHOST_DEV_NX_DAEMON || '').toLowerCase())) {
        env.NX_DAEMON = 'false';
    }

    printCommand(pnpmBin, args, env);

    const child = spawn(pnpmBin, args, {
        cwd: rootDir,
        detached: process.platform !== 'win32',
        env,
        stdio: 'inherit'
    });

    child.on('error', (error) => {
        console.error(`[dev-supervisor] Failed to start dev command: ${error.message}`);
        removeState();
        process.exit(1);
    });

    writeState({
        startedAt: new Date().toISOString(),
        platform: `${os.platform()}-${os.arch()}`,
        supervisorPid: process.pid,
        childPid: child.pid,
        command: pnpmBin,
        args,
        nxDaemon: env.NX_DAEMON === 'false' ? 'disabled' : 'default'
    });

    let shuttingDown = false;

    function shutdown(signal) {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        console.log(`\n[dev-supervisor] Received ${signal}; forwarding to dev process group ${child.pid}.`);

        signalProcessGroup(child.pid, signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
        spawnCleanupHelper(child.pid);

        setTimeout(() => {
            if (processGroupExists(child.pid)) {
                console.log('[dev-supervisor] Dev process group is still running; sending SIGTERM.');
                signalProcessGroup(child.pid, 'SIGTERM');
            }

            console.log('[dev-supervisor] Ensuring Docker dev services are stopped.');
            runDockerDown();
        }, 8000).unref();

        setTimeout(() => {
            if (processGroupExists(child.pid)) {
                console.log('[dev-supervisor] Dev process group is still running; sending SIGKILL.');
                signalProcessGroup(child.pid, 'SIGKILL');
            }
        }, 11000).unref();
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    child.on('exit', (code, signal) => {
        removeState();

        if (shuttingDown) {
            process.exit(0);
        }

        if (signal) {
            console.log(`[dev-supervisor] Dev process exited from ${signal}.`);
            process.exit(1);
        }

        process.exit(code || 0);
    });
}

const command = process.argv[2];

if (command === 'status') {
    status();
} else if (command === 'cleanup-helper') {
    cleanupHelper().catch((error) => {
        console.error(error);
        process.exit(1);
    });
} else {
    start();
}
