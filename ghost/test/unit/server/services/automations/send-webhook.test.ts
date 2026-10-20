import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import sinon from 'sinon';
import {
  WEBHOOK_TIMEOUT_MS,
  renderWebhookBody,
  sendWebhook,
} from '../../../../../core/server/services/automations/send-webhook';

const member = { id: 'member-id', email: 'member@example.com' };

describe('renderWebhookBody', function () {
  it('interpolates the member ID and email', function () {
    assert.equal(
      renderWebhookBody('{"id":"{{member.id}}","email":"{{ member.email }}"}', member),
      '{"id":"member-id","email":"member@example.com"}',
    );
  });

  it('JSON-escapes interpolated values', function () {
    assert.equal(
      renderWebhookBody('{"email":"{{member.email}}"}', { id: 'x', email: 'a"b\\c@example.com' }),
      '{"email":"a\\"b\\\\c@example.com"}',
    );
  });

  it('leaves unknown tags untouched', function () {
    assert.equal(
      renderWebhookBody('{"name":"{{member.name}}","x":"{{nope}}"}', member),
      '{"name":"{{member.name}}","x":"{{nope}}"}',
    );
  });
});

describe('sendWebhook', function () {
  let server: http.Server;
  let url: string;
  let status: number;
  let received: { method?: string; headers: http.IncomingHttpHeaders; body: string }[];

  beforeEach(async function () {
    status = 200;
    received = [];
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        received.push({ method: req.method, headers: req.headers, body });
        if (status >= 300 && status < 400) {
          res.setHeader('Location', '/elsewhere');
        }
        res.writeHead(status).end('response body');
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
  });

  afterEach(async function () {
    sinon.restore();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('sends a JSON request with the configured method and rendered body', async function () {
    await sendWebhook({ url, method: 'PUT', body: '{"email":"{{member.email}}"}' }, member);

    assert.equal(received.length, 1);
    assert.equal(received[0].method, 'PUT');
    assert.equal(received[0].headers['content-type'], 'application/json');
    assert.equal(received[0].body, '{"email":"member@example.com"}');
  });

  it('uses a 15-second timeout', async function () {
    const timeout = sinon.spy(AbortSignal, 'timeout');

    await sendWebhook({ url, method: 'POST', body: '{}' }, member);

    assert.equal(WEBHOOK_TIMEOUT_MS, 15_000);
    sinon.assert.calledOnceWithExactly(timeout, 15_000);
  });

  for (const failingStatus of [301, 302, 307, 400, 500]) {
    it(`rejects HTTP ${failingStatus} responses without following redirects`, async function () {
      status = failingStatus;

      await assert.rejects(
        sendWebhook({ url, method: 'POST', body: '{}' }, member),
        new RegExp(`HTTP ${failingStatus}`),
      );
      assert.equal(received.length, 1);
    });
  }

  it('rejects when the request fails', async function () {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    server = http.createServer();
    server.listen(0);

    await assert.rejects(sendWebhook({ url, method: 'POST', body: '{}' }, member));
  });
});
