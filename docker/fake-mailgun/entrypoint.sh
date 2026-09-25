#!/bin/sh
set -eu

exec node --import tsx --input-type=module <<'JS'
import { FakeMailgunServer } from './helpers/services/mailgun/fake-mailgun-server.ts';

const server = new FakeMailgunServer({ port: 4010, mailpitUrl: 'http://mailpit:8025' });
await server.start();
console.log('Fake Mailgun listening on port 4010; bulk email goes to Mailpit.');

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
        await server.stop();
    });
}
JS
