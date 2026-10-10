import { devUrl, resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

const env = await resolveGhostDevEnv();
console.log(
  `Ghost dev: ${devUrl({ ...env })}ghost/ (Ghost on port ${env.GHOST_DEV_BACKEND_PORT}, database ${env.GHOST_DEV_DATABASE})`,
);
