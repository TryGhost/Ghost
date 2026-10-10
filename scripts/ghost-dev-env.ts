import { prepareStart } from './lib/dev-stack.ts';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

await prepareStart();
const env = await resolveGhostDevEnv();
console.log(
  `Ghost dev: http://localhost:${env.GHOST_DEV_PORT}/ghost/ (Ghost on port ${env.GHOST_DEV_BACKEND_PORT}, database ${env.GHOST_DEV_DATABASE})`,
);
