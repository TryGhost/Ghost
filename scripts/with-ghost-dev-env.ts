import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Runs a command with the configuration Ghost needs when it runs on the host against
// the compose services' published ports. The Admin dev server owns the public port
// (GHOST_DEV_PORT) and proxies everything that isn't Admin to Ghost (GHOST_DEV_BACKEND_PORT).
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const assigned = await resolveGhostDevEnv();
const frontDoorPort = process.env.GHOST_DEV_PORT ?? assigned.GHOST_DEV_PORT;
const backendPort = process.env.GHOST_DEV_BACKEND_PORT ?? assigned.GHOST_DEV_BACKEND_PORT;
const database = process.env.GHOST_DEV_DATABASE ?? assigned.GHOST_DEV_DATABASE;

const defaults: Record<string, string> = {
  NODE_ENV: 'development',
  url: `http://localhost:${frontDoorPort}/`,
  server__host: '127.0.0.1',
  server__port: backendPort,
  database__client: 'mysql2',
  database__connection__host: '127.0.0.1',
  database__connection__port: '3306',
  database__connection__user: 'root',
  database__connection__password: process.env.MYSQL_ROOT_PASSWORD ?? 'root',
  database__connection__database: database,
  mail__transport: 'SMTP',
  mail__options__host: '127.0.0.1',
  mail__options__port: '1025',
  // Mailpit tags each message with this username, so one inbox serves every checkout
  mail__options__auth__user: assigned.GHOST_DEV_NAME,
  mail__options__auth__pass: 'dev',
  adapters__cache__Redis__host: '127.0.0.1',
  adapters__cache__Redis__port: '6379',
  queryParameterFiltering__enabled: process.env.QUERY_PARAMETER_FILTERING_ENABLED ?? 'true',
  // Built by each app's `vite build --watch` and served by the Admin dev server
  portal__url: '/ghost/assets/portal/portal.min.js',
  comments__url: '/ghost/assets/comments-ui/comments-ui.min.js',
  sodoSearch__url: '/ghost/assets/sodo-search/sodo-search.min.js',
  sodoSearch__styles: '/ghost/assets/sodo-search/main.css',
  signupForm__url: '/ghost/assets/signup-form/signup-form.min.js',
  announcementBar__url: '/ghost/assets/announcement-bar/announcement-bar.min.js',
  adminToolbar__url: '/ghost/assets/admin-toolbar/admin-toolbar.min.js',
};

interface ComposeConfig {
  services: Record<
    string,
    {
      image?: string;
      environment?: Record<string, string | null>;
      ports?: { target: number; published?: string }[];
    }
  >;
  volumes?: Record<string, { name?: string }>;
}

function composeConfig(files: string[]): ComposeConfig {
  const args = [
    'compose',
    '-f',
    'compose.dev.yaml',
    ...files,
    '--profile',
    'docker-dev',
    'config',
    '--format',
    'json',
  ];
  return JSON.parse(
    execFileSync('docker', args, { cwd: repoRoot, encoding: 'utf8' }),
  ) as ComposeConfig;
}

/**
 * The compose overlays (analytics, storage, Mailgun, Stripe) configure Ghost through
 * the ghost-dev service's environment. Apply what they add on top of the base file,
 * pointing their service hostnames at the ports those services publish to the host.
 */
function overlayEnv(files: string[]): Record<string, string> {
  const base = composeConfig([]).services['ghost-dev']?.environment ?? {};
  const config = composeConfig(files);
  const published = (service: string, port: number) =>
    config.services[service]?.ports?.find((p) => p.target === port)?.published;

  const toHost = (key: string, value: string) => {
    // Bare hostnames only in host settings: a bucket can share a service's name
    if (/host$/i.test(key) && value !== 'ghost-dev' && config.services[value]) {
      return '127.0.0.1';
    }
    return value.replace(
      /^(\w+:\/\/)([^/:]+)(?::(\d+))?/,
      (match, scheme: string, host: string, port?: string) => {
        if (host === 'localhost' || host === '127.0.0.1') {
          return port === '2368' ? `${scheme}${host}:${frontDoorPort}` : match;
        }
        if (!config.services[host]) {
          return match;
        }
        const hostPort = port && published(host, Number(port));
        if (!hostPort) {
          throw new Error(
            `${host}:${port} has to be published for Ghost to reach it from the host`,
          );
        }
        return `${scheme}127.0.0.1:${hostPort}`;
      },
    );
  };

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.services['ghost-dev']?.environment ?? {})) {
    if (value !== null && base[key] !== value) {
      env[key] = toHost(key, value);
    }
  }

  // Tinybird tokens and the Stripe webhook secret are written by containers into the
  // shared-config volume; the ghost-dev entrypoint used to source them
  const volume = config.volumes?.['shared-config']?.name;
  const image = config.services.redis?.image;
  if (volume && image) {
    const shared: Record<string, string> = {};
    const out = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${volume}:/c:ro`,
        '--entrypoint',
        'sh',
        image,
        '-c',
        'cat /c/.env.tinybird /c/.env.stripe 2>/dev/null; true',
      ],
      { encoding: 'utf8' },
    );
    for (const line of out.split('\n')) {
      const [, key, val] = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()) ?? [];
      if (key) {
        shared[key] = val ?? '';
      }
    }
    if (shared.TINYBIRD_WORKSPACE_ID && shared.TINYBIRD_ADMIN_TOKEN) {
      env.tinybird__workspaceId = shared.TINYBIRD_WORKSPACE_ID;
      env.tinybird__adminToken = shared.TINYBIRD_ADMIN_TOKEN;
    }
    if (shared.STRIPE_WEBHOOK_SECRET) {
      env.WEBHOOK_SECRET = shared.STRIPE_WEBHOOK_SECRET;
    }
  }
  return env;
}

const overlayFiles = (process.env.DEV_COMPOSE_FILES ?? '').split(/\s+/).filter(Boolean);
const stripeProfile = (process.env.COMPOSE_PROFILES ?? '').split(',').includes('stripe');
const overlays = overlayFiles.length > 0 || stripeProfile ? overlayEnv(overlayFiles) : {};

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-ghost-dev-env.ts <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...defaults, ...overlays, ...process.env },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
