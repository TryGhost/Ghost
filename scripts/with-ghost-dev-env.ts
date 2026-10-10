import { execFileSync, spawn } from 'node:child_process';
import {
  composeConfig,
  hostOverlayEnv,
  overlayArgs,
  type ComposeConfig,
} from './lib/dev-compose.ts';
import { parseEnv, resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Runs a command with the configuration Ghost needs when it runs on the host against
// the compose services' published ports. The Admin dev server owns the public port
// (GHOST_DEV_PORT) and proxies everything that isn't Admin to Ghost (GHOST_DEV_BACKEND_PORT).
// Values already in the environment win, e.g. inside the devcontainer.
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

// Secrets that tb-cli and Stripe's command line tool write to the shared-config volume
function sharedConfigEnv(config: ComposeConfig): Record<string, string> {
  const files = [
    ...(config.services['tb-cli'] ? ['/c/.env.tinybird'] : []),
    ...(config.services.stripe ? ['/c/.env.stripe'] : []),
  ];
  const volume = config.volumes?.['shared-config']?.name;
  const image = config.services.redis?.image;
  if (files.length === 0 || !volume || !image) {
    return {};
  }
  const shared = parseEnv(
    execFileSync(
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
        'cat "$@" 2>/dev/null; true',
        'sh',
        ...files,
      ],
      { encoding: 'utf8' },
    ),
  );
  const env: Record<string, string> = {};
  if (shared.TINYBIRD_WORKSPACE_ID && shared.TINYBIRD_ADMIN_TOKEN) {
    env.tinybird__workspaceId = shared.TINYBIRD_WORKSPACE_ID;
    env.tinybird__adminToken = shared.TINYBIRD_ADMIN_TOKEN;
  }
  if (shared.STRIPE_WEBHOOK_SECRET) {
    env.WEBHOOK_SECRET = shared.STRIPE_WEBHOOK_SECRET;
  }
  return env;
}

// The DEV_COMPOSE_FILES overlays and the stripe profile configure Ghost through the
// ghost-dev service's environment
const overlays = overlayArgs();
let overlayEnv: Record<string, string> = {};
if (overlays.length > 0 || (process.env.COMPOSE_PROFILES ?? '').split(',').includes('stripe')) {
  const config = composeConfig(overlays);
  overlayEnv = {
    ...hostOverlayEnv(composeConfig([]), config, frontDoorPort),
    ...sharedConfigEnv(config),
  };
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-ghost-dev-env.ts <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...defaults, ...overlayEnv, ...process.env },
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
