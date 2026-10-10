import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

const env = await resolveGhostDevEnv();
console.log(
  `Ghost dev: http://${env.GHOST_DEV_HOSTNAME}:${env.GHOST_DEV_PORT}/ghost/ (Ghost on port ${env.GHOST_DEV_BACKEND_PORT}, database ${env.GHOST_DEV_DATABASE})`,
);
