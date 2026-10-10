import { spawn } from 'node:child_process';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Runs a command with the configuration Ghost needs when it runs on the host against
// the compose services' published ports. The Admin dev server owns the public port
// (GHOST_DEV_PORT) and proxies everything that isn't Admin to Ghost (GHOST_DEV_BACKEND_PORT).
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

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-ghost-dev-env.ts <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, { stdio: 'inherit', env: { ...defaults, ...process.env } });
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
