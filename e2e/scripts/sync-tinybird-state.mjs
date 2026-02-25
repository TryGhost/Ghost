import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const stateDir = path.resolve(repoRoot, 'e2e/data/state');
const configPath = path.resolve(stateDir, 'tinybird.json');

const composeArgs = [
    'compose',
    '-f', path.resolve(repoRoot, 'compose.dev.yaml'),
    '-f', path.resolve(repoRoot, 'compose.dev.analytics.yaml')
];
const composeProject = process.env.COMPOSE_PROJECT_NAME || 'ghost-dev';

function log(message) {
    process.stdout.write(`${message}\n`);
}

function parseEnv(raw) {
    const vars = {};

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        vars[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
    }

    return vars;
}

function clearConfigIfPresent() {
    if (fs.existsSync(configPath)) {
        fs.rmSync(configPath, {force: true});
        log(`Removed stale Tinybird config at ${configPath}`);
    }
}

function runCompose(args) {
    return execFileSync('docker', [...composeArgs, ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
}

function isTinybirdRunning() {
    const output = execFileSync('docker', [
        'ps',
        '--filter', `label=com.docker.compose.project=${composeProject}`,
        '--filter', 'label=com.docker.compose.service=tinybird-local',
        '--filter', 'status=running',
        '--format', '{{.Names}}'
    ], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });

    return Boolean(output.trim());
}

function fetchConfigFromTbCli() {
    return runCompose([
        'run',
        '--rm',
        '-T',
        'tb-cli',
        'cat',
        '/mnt/shared-config/.env.tinybird'
    ]);
}

function writeConfig(env) {
    fs.mkdirSync(stateDir, {recursive: true});
    fs.writeFileSync(configPath, JSON.stringify({
        workspaceId: env.TINYBIRD_WORKSPACE_ID,
        adminToken: env.TINYBIRD_ADMIN_TOKEN,
        trackerToken: env.TINYBIRD_TRACKER_TOKEN
    }, null, 2));
}

try {
    if (!isTinybirdRunning()) {
        clearConfigIfPresent();
        log(`Tinybird is not running for compose project ${composeProject}; skipping Tinybird state sync (non-analytics runs are allowed)`);
        process.exit(0);
    }

    const rawEnv = fetchConfigFromTbCli();
    const env = parseEnv(rawEnv);

    if (!env.TINYBIRD_WORKSPACE_ID || !env.TINYBIRD_ADMIN_TOKEN) {
        clearConfigIfPresent();
        throw new Error('Tinybird is running but required config values are missing in /mnt/shared-config/.env.tinybird');
    }

    writeConfig(env);
    log(`Wrote Tinybird config to ${configPath}`);
} catch (error) {
    clearConfigIfPresent();
    const message = error instanceof Error ? error.message : String(error);
    log(`Tinybird state sync failed: ${message}`);
    process.exit(1);
}
