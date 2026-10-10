import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const stateDir = path.resolve(repoRoot, 'e2e/data/state');
const configPath = path.resolve(stateDir, 'tinybird.json');

const composeProject = process.env.COMPOSE_PROJECT_NAME || 'ghost-dev';
const tinybirdConfigPath = '/mnt/shared-config/.env.tinybird';

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
    fs.rmSync(configPath, { force: true });
    log(`Removed stale Tinybird config at ${configPath}`);
  }
}

function findContainer(service, extraFilters = []) {
  const output = execFileSync(
    'docker',
    [
      'ps',
      ...extraFilters,
      '--filter',
      `label=com.docker.compose.project=${composeProject}`,
      '--filter',
      `label=com.docker.compose.service=${service}`,
      '--format',
      '{{.Names}}',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  return output.trim().split('\n')[0] || null;
}

function isTinybirdRunning() {
  return Boolean(findContainer('tinybird-local', ['--filter', 'status=running']));
}

// Copied out of the tb-cli container rather than read through `docker compose
// run`. That would re-run the tb-cli entrypoint (a full datafile deploy), and,
// worse, compose would recreate any dependency whose config differs from the
// compose files listed here — silently replacing a tinybird-local started from
// an override (see e2e/compose.e2e.tinybird-slim.yaml). `docker cp` reads the
// same file straight from the exited container and cannot diverge.
function fetchConfigFromTbCli() {
  const container = findContainer('tb-cli', ['-a']);

  if (!container) {
    throw new Error(`No tb-cli container found for compose project ${composeProject}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-e2e-tinybird-'));
  const tmpFile = path.join(tmpDir, '.env.tinybird');

  try {
    execFileSync('docker', ['cp', `${container}:${tinybirdConfigPath}`, tmpFile], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return fs.readFileSync(tmpFile, 'utf8');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function writeConfig(env) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        workspaceId: env.TINYBIRD_WORKSPACE_ID,
        adminToken: env.TINYBIRD_ADMIN_TOKEN,
        trackerToken: env.TINYBIRD_TRACKER_TOKEN,
      },
      null,
      2,
    ),
  );
}

try {
  if (!isTinybirdRunning()) {
    clearConfigIfPresent();
    log(
      `Tinybird is not running for compose project ${composeProject}; skipping Tinybird state sync (non-analytics runs are allowed)`,
    );
    process.exit(0);
  }

  const rawEnv = fetchConfigFromTbCli();
  const env = parseEnv(rawEnv);

  if (!env.TINYBIRD_WORKSPACE_ID || !env.TINYBIRD_ADMIN_TOKEN) {
    clearConfigIfPresent();
    throw new Error(
      `Tinybird is running but required config values are missing in ${tinybirdConfigPath}`,
    );
  }

  writeConfig(env);
  log(`Wrote Tinybird config to ${configPath}`);
} catch (error) {
  clearConfigIfPresent();
  const message = error instanceof Error ? error.message : String(error);
  log(`Tinybird state sync failed: ${message}`);
  process.exit(1);
}
