#!/bin/sh
set -eu

exec node --import tsx --input-type=module <<'JS'
import { FakeMailgunServer, behaviorFromEnv } from './helpers/services/mailgun/fake-mailgun-server.ts';

const server = new FakeMailgunServer({
    port: 4010,
    mailpitUrl: 'http://mailpit:8025',
    behavior: behaviorFromEnv(process.env),
});
await server.start();
console.log('Fake Mailgun listening on port 4010; bulk email goes to Mailpit.');
console.log('Behavior:', JSON.stringify(server.behavior));

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
        await server.stop();
    });
}
JS
