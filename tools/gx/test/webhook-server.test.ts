import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createWebhookServer } from '../webhook-server.ts';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }),
  );
});

async function start() {
  const server = createWebhookServer().listen(0, '127.0.0.1');
  servers.push(server);
  await once(server, 'listening');
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function readEvents(response: Response, count: number) {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let text = '';
  while (text.split('\n\n').length <= count) {
    const { value, done } = await reader.read();
    assert(!done);
    text += value;
  }
  await reader.cancel();
  return text
    .split('\n\n')
    .slice(0, count)
    .map((event) => JSON.parse(event.replace(/^data: /, '')));
}

test('serves a page that subscribes to server-sent events', async () => {
  const url = await start();
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /new EventSource\('\/events'\)/);
});

test('records webhooks and streams past and new payloads', async () => {
  const url = await start();
  const first = await fetch(`${url}/webhook`, { method: 'POST', body: '{"n":1}' });
  assert.equal(first.status, 204);

  const events = await fetch(`${url}/events`);
  assert.equal(events.headers.get('content-type'), 'text/event-stream');
  const received = readEvents(events, 2);
  await fetch(`${url}/webhook?status=500`, { method: 'PUT', body: 'not json' }).then((response) =>
    assert.equal(response.status, 500),
  );

  const [past, next] = await received;
  assert.deepEqual([past.method, past.url, past.body], ['POST', '/webhook', { n: 1 }]);
  assert.deepEqual([next.method, next.url, next.body], ['PUT', '/webhook?status=500', 'not json']);
});

test('returns 404 for other routes', async () => {
  const url = await start();
  assert.equal((await fetch(`${url}/webhook`)).status, 404);
  assert.equal((await fetch(`${url}/nope`, { method: 'POST' })).status, 404);
});
