import {serve} from '@hono/node-server';
import {createApp} from './app/app.js';
import {createAppDependencies} from './app/bootstrap.js';

const dependencies = await createAppDependencies();
const app = createApp(dependencies);

serve({
    fetch: app.fetch,
    port: dependencies.config.port
});
