import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Request, Response } from 'express';
import nock from 'nock';

import { queueRequest } from '../../../../../../core/server/web/parent/middleware/queue-request';

type Held = { req: Request; res: Response };

describe('Queue request middleware', function () {
  let server: http.Server;
  let port: number;
  // requests that reached the /hold handler, in the order they started
  let held: Held[];
  let waiters: Array<() => void>;

  async function listen(concurrencyLimit: number) {
    const app = express();

    app.use(queueRequest({ concurrencyLimit }));
    app.get('/hold/:id', (req, res) => {
      held.push({ req, res });
      waiters.splice(0).forEach((resolve) => resolve());
    });
    app.get(['/instant', '/instant.css'], (req, res) => {
      res.json({ queueDepth: req.queueDepth, extra: req.extra });
    });

    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => {
      server.once('listening', resolve);
    });
    port = (server.address() as AddressInfo).port;
  }

  async function heldCount(count: number) {
    while (held.length < count) {
      await new Promise<void>((resolve) => {
        waiters.push(resolve);
      });
    }
  }

  function get(path: string) {
    // URL string: host/port options throw Invalid URL once another file has loaded Sentry's http wrapper
    const req = http.get(`http://127.0.0.1:${port}${path}`, { agent: false });
    const response = new Promise<{ status?: number; body: string }>((resolve, reject) => {
      req.on('response', (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
    });
    // callers that abort the request don't await the response
    response.catch(() => {});

    return { req, response };
  }

  beforeEach(function () {
    held = [];
    waiters = [];
    nock.enableNetConnect('127.0.0.1');
  });

  afterEach(function () {
    server?.closeAllConnections();
    server?.close();
    nock.disableNetConnect();
  });

  it('throws if the concurrency limit is not defined in the config', function () {
    assert.throws(() => {
      queueRequest({});
    }, /concurrencyLimit must be defined when using queueRequest middleware/);
  });

  it('throws if the concurrency limit is not a positive integer', function () {
    for (const concurrencyLimit of [0, -1, 1.5, Number.NaN]) {
      assert.throws(() => {
        queueRequest({ concurrencyLimit });
      }, /concurrencyLimit must be a positive integer/);
    }
  });

  it('drains a deep queue of handlers that respond synchronously', async function () {
    const middleware = queueRequest({ concurrencyLimit: 1 });
    const fakeRequest = () => {
      const res = Object.assign(new EventEmitter(), { end: () => res });
      return { req: { path: '/sync' } as Request, res: res as unknown as Response };
    };

    const first = fakeRequest();
    middleware(first.req, first.res, () => {});

    const depth = 50000;
    let completed = 0;
    for (let i = 0; i < depth; i++) {
      const { req, res } = fakeRequest();
      middleware(req, res, () => {
        completed += 1;
        res.end();
      });
    }

    // a synchronous drain would recurse once per queued request and overflow the stack
    first.res.end();
    let completedWhenOtherWorkRan = -1;
    setImmediate(() => {
      completedWhenOtherWorkRan = completed;
    });
    while (completed < depth) {
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
    }

    assert.equal(completed, depth);
    // the drain yields between passes, so other queued work gets to run part-way through
    assert.ok(
      completedWhenOtherWorkRan < depth,
      `other work only ran after ${completedWhenOtherWorkRan} requests had completed`,
    );
  });

  it('does not queue requests for static assets', async function () {
    await listen(1);
    get('/hold/1');
    await heldCount(1);

    const { status, body } = await get('/instant.css').response;

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body), { queueDepth: 0 });
  });

  it('limits concurrency and starts queued requests in arrival order', async function () {
    await listen(2);
    get('/hold/1');
    get('/hold/2');
    await heldCount(2);

    get('/hold/3');
    get('/hold/4');
    // give the queued requests time to arrive
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    assert.equal(held.length, 2);
    assert.equal(held[0].req.queueDepth, 0);

    held[0].res.end();
    await heldCount(3);
    held[1].res.end();
    await heldCount(4);

    assert.deepEqual(
      held.map(({ req }) => req.params.id),
      ['1', '2', '3', '4'],
    );
    assert.equal(held[2].req.queueDepth, 0);
    assert.equal(held[3].req.queueDepth, 1);
  });

  it('records how long a request waited in the queue', async function () {
    await listen(1);
    get('/hold/1');
    await heldCount(1);

    const queued = get('/instant');
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    held[0].res.end();

    const { body } = await queued.response;
    const { queueDepth, extra } = JSON.parse(body);

    assert.equal(queueDepth, 0);
    assert.ok(extra.queueWaitMs >= 40, `expected a wait of ~50ms, got ${extra.queueWaitMs}`);
  });

  it('drops a queued request when its client disconnects', async function () {
    await listen(1);
    get('/hold/1');
    await heldCount(1);

    const abandoned = get('/hold/abandoned');
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    const next = get('/instant');
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    abandoned.req.destroy();
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    held[0].res.end();
    const { status, body } = await next.response;

    assert.equal(status, 200);
    // only the request ahead of it was still queued when it arrived
    assert.deepEqual(JSON.parse(body).queueDepth, 1);
    assert.deepEqual(
      held.map(({ req }) => req.params.id),
      ['1'],
    );
  });

  it('frees the slot when a client disconnects from a handler that never responds', async function () {
    await listen(1);
    const hungUp = get('/hold/1');
    await heldCount(1);

    hungUp.req.destroy();
    const { status } = await get('/instant').response;

    assert.equal(status, 200);
  });

  it('releases a slot only once when a response ends and then closes', async function () {
    await listen(1);
    const first = get('/hold/1');
    await heldCount(1);

    get('/hold/2');
    get('/hold/3');
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    held[0].res.end('done');
    await first.response;
    await heldCount(2);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    // a double release would have started request 3 alongside request 2
    assert.deepEqual(
      held.map(({ req }) => req.params.id),
      ['1', '2'],
    );
  });
});
