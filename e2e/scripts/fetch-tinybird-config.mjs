import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const stateDir = path.resolve(repoRoot, 'e2e/data/state');
const configPath = path.resolve(stateDir, 'tinybird.json');

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

try {
    const rawEnv = execFileSync(
        'docker',
        [
            'compose',
            '-f', path.resolve(repoRoot, 'compose.dev.yaml'),
            '-f', path.resolve(repoRoot, 'compose.dev.analytics.yaml'),
            'run',
            '--rm',
            '-T',
            'tb-cli',
            'cat',
            '/mnt/shared-config/.env.tinybird'
        ],
        {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    const env = parseEnv(rawEnv);

    if (!env.TINYBIRD_WORKSPACE_ID || !env.TINYBIRD_ADMIN_TOKEN) {
        clearConfigIfPresent();
        log('Tinybird config is not available yet; continuing without e2e/data/state/tinybird.json');
        process.exit(0);
    }

    fs.mkdirSync(stateDir, {recursive: true});
    fs.writeFileSync(configPath, JSON.stringify({
        workspaceId: env.TINYBIRD_WORKSPACE_ID,
        adminToken: env.TINYBIRD_ADMIN_TOKEN,
        trackerToken: env.TINYBIRD_TRACKER_TOKEN
    }, null, 2));

    log(`Wrote Tinybird config to ${configPath}`);
} catch (error) {
    clearConfigIfPresent();
    const message = error instanceof Error ? error.message : String(error);
    log(`Tinybird config fetch skipped: ${message}`);
}
