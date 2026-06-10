import {createApp} from '../app/app.js';
import {createAppDependencies} from '../app/bootstrap.js';

const args = process.argv.slice(2);
const pathIndex = args.findIndex((arg) => arg === '--path');
const path = pathIndex >= 0 ? args[pathIndex + 1] ?? '/' : '/';

const run = async () => {
    const dependencies = createAppDependencies();
    const app = createApp(dependencies);
    const response = await app.request(path);
    const body = await response.text();
    process.stdout.write(`status ${response.status}\n`);
    process.stdout.write(body + '\n');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
