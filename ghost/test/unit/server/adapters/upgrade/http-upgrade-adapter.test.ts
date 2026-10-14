import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  createUpgradeRequestSchema,
  upgradeErrorCodeSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
} from '@tryghost/adapter-base-upgrade';
import HttpUpgradeAdapter, {
  PROTOCOL,
  errorBodySchema,
  handshakeSchema,
} from '../../../../../core/server/adapters/upgrade/HttpUpgradeAdapter';

const FIXTURES = path.join(__dirname, '../../../../utils/fixtures/upgrade-supervisor');

// Each fixture's filename prefix names the body it is.
const accepts: Record<string, (body: unknown) => boolean> = {
  request: (body) => createUpgradeRequestSchema.safeParse(body).success,
  status: (body) => upgradeStatusSchema.safeParse(body).success,
  job: (body) => upgradeJobSchema.safeParse(body).success,
  lookup: (body) => upgradeJobResultSchema.safeParse(body).success,
  handshake: (body) => handshakeSchema.safeParse(body).success,
  error: (body) => {
    const parsed = errorBodySchema.safeParse(body);
    return parsed.success && upgradeErrorCodeSchema.safeParse(parsed.data.error.code).success;
  },
};

const key = 'a'.repeat(64);
const request = { component: 'ghost', toVersion: '6.71.0', idempotencyKey: key };
const job = {
  id: key,
  state: 'pending',
  component: 'ghost',
  toVersion: '6.71.0',
  createdAt: '2026-10-14T12:00:00.000Z',
  updatedAt: '2026-10-14T12:00:00.000Z',
};
const status = {
  supported: true,
  availability: 'ready',
  backupRequired: true,
  currentVersion: '6.70.0',
  oneClick: [{ component: 'ghost', fromVersion: '6.70.0', toVersion: '6.71.0' }],
  manual: [],
};

type Handler = (req: {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}) => { status: number; body?: unknown } | ((res: http.ServerResponse) => void) | null;

describe('HttpUpgradeAdapter', function () {
  let dir: string;
  let socketPath: string;
  let server: http.Server;
  let handler: Handler;
  let requests: Array<Parameters<Handler>[0]>;

  // The supervisor's side of the protocol, answering from the current test's handler.
  beforeEach(async function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upgrade-http-'));
    socketPath = path.join(dir, 'supervisor.sock');
    requests = [];
    handler = (req) => {
      if (req.url === '/v1') {
        return { status: 200, body: { protocol: PROTOCOL } };
      }
      if (req.url === '/v1/status') {
        return { status: 200, body: status };
      }
      return { status: 404, body: { error: { code: 'not-found' } } };
    };
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const captured = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: text ? JSON.parse(text) : undefined,
        };
        requests.push(captured);
        const answer = handler(captured);
        if (!answer) {
          return; // Never answer, to exercise the client timeout.
        }
        if (typeof answer === 'function') {
          answer(res);
          return;
        }
        res.writeHead(answer.status, { 'content-type': 'application/json' });
        res.end(answer.body === undefined ? '' : JSON.stringify(answer.body));
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(socketPath, resolve);
    });
  });

  afterEach(async function () {
    server.closeAllConnections();
    await new Promise((resolve) => {
      server.close(resolve);
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('protocol fixtures', function () {
    for (const kind of ['valid', 'invalid']) {
      for (const file of fs.readdirSync(path.join(FIXTURES, kind))) {
        it(`${kind === 'valid' ? 'accepts' : 'refuses'} ${file}`, function () {
          const accept = accepts[file.split('-')[0].replace('.json', '')];
          const body = JSON.parse(fs.readFileSync(path.join(FIXTURES, kind, file), 'utf8'));

          assert.ok(accept, `No schema for ${file}`);
          assert.equal(accept(body), kind === 'valid');
        });
      }
    }
  });

  describe('validate', function () {
    it('requires an absolute socketPath', function () {
      for (const config of [{}, { socketPath: '' }, { socketPath: 'relative.sock' }]) {
        assert.throws(() => HttpUpgradeAdapter.validate(config), {
          errorType: 'IncorrectUsageError',
        });
        assert.throws(() => new HttpUpgradeAdapter(config), { errorType: 'IncorrectUsageError' });
      }
      assert.doesNotThrow(() => HttpUpgradeAdapter.validate({ socketPath }));
    });
  });

  describe('getStatus', function () {
    it('checks the protocol, then returns the host status', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath });

      const result = await adapter.getStatus();

      assert.equal(result.supported && result.availability, 'ready');
      assert.deepEqual(
        requests.map((req) => req.url),
        ['/v1', '/v1/status'],
      );
    });

    it('reports a missing socket, a 5xx or a timeout as unavailable', async function () {
      const missing = new HttpUpgradeAdapter({ socketPath: path.join(dir, 'nope.sock') });
      const unavailable = async (adapter: HttpUpgradeAdapter) => {
        const result = await adapter.getStatus();
        assert.equal(result.supported && result.availability, 'unavailable');
      };

      await unavailable(missing);

      handler = () => ({ status: 503, body: { error: { code: 'unavailable' } } });
      await unavailable(new HttpUpgradeAdapter({ socketPath }));

      handler = () => null;
      await unavailable(new HttpUpgradeAdapter({ socketPath, timeoutMs: 50 }));
    });

    it('reports a connection dropped mid-body as unavailable', async function () {
      handler = () => (res) => {
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': '100' });
        res.write('{"protocol":');
        res.socket?.destroy();
      };

      const result = await new HttpUpgradeAdapter({ socketPath }).getStatus();

      assert.equal(result.supported && result.availability, 'unavailable');
    });

    it('gives up on a body still trickling in at the deadline', async function () {
      handler = () => (res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        const timer = setInterval(() => res.write(' '), 10);
        res.on('close', () => clearInterval(timer));
      };

      const result = await new HttpUpgradeAdapter({ socketPath, timeoutMs: 100 }).getStatus();

      assert.equal(result.supported && result.availability, 'unavailable');
    });

    it('refuses a response larger than any protocol body', async function () {
      handler = () => ({ status: 200, body: { padding: 'x'.repeat(1024 * 1024) } });

      await assert.rejects(new HttpUpgradeAdapter({ socketPath }).getStatus());
    });

    it('passes through a host that does not support updates', async function () {
      handler = (req) =>
        req.url === '/v1'
          ? { status: 200, body: { protocol: PROTOCOL } }
          : { status: 200, body: { supported: false, reason: 'not-supported' } };

      assert.deepEqual(await new HttpUpgradeAdapter({ socketPath }).getStatus(), {
        supported: false,
        reason: 'not-supported',
      });
    });

    it('reports a missing or different protocol as incompatible', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath });
      const incompatible = async () => {
        const result = await adapter.getStatus();
        assert.equal(result.supported && result.availability, 'incompatible');
      };

      handler = () => ({ status: 404 });
      await incompatible();

      handler = (req) =>
        req.url === '/v1'
          ? { status: 200, body: { protocol: PROTOCOL + 1 } }
          : { status: 200, body: status };
      await incompatible();
    });
  });

  describe('createRequest', function () {
    it('posts the request and returns the accepted job', async function () {
      handler = () => ({ status: 202, body: job });
      const adapter = new HttpUpgradeAdapter({ socketPath });

      assert.deepEqual(await adapter.createRequest(request), job);
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].url, '/v1/requests');
      assert.deepEqual(requests[0].body, request);
    });

    it('returns the original job for a replay', async function () {
      handler = () => ({ status: 200, body: { ...job, state: 'pulling' } });

      const result = await new HttpUpgradeAdapter({ socketPath }).createRequest(request);

      assert.equal(result.state, 'pulling');
    });

    it('maps host rejections and their diagnostics', async function () {
      const diagnostics = [
        { source: 'ghost-docker', code: 'busy', severity: 'info', message: 'A job is running.' },
      ];
      const adapter = new HttpUpgradeAdapter({ socketPath });

      for (const [statusCode, code] of [
        [409, 'busy'],
        [409, 'idempotency-conflict'],
        [422, 'target-unapproved'],
        [410, 'request-expired'],
        [503, 'unavailable'],
      ] as const) {
        handler = () => ({ status: statusCode, body: { error: { code, diagnostics } } });
        await assert.rejects(adapter.createRequest(request), { code, diagnostics });
      }
    });

    it('rejects a 5xx without a protocol error body as unavailable', async function () {
      handler = () => ({ status: 502 });

      await assert.rejects(new HttpUpgradeAdapter({ socketPath }).createRequest(request), {
        code: 'unavailable',
      });
    });

    it('rejects as unavailable when the host cannot be reached', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath: path.join(dir, 'nope.sock') });

      await assert.rejects(adapter.createRequest(request), { code: 'unavailable' });
    });

    it('treats a malformed-request answer as a failure, not a rejection', async function () {
      handler = () => ({ status: 400, body: { error: { code: 'malformed' } } });

      await assert.rejects(new HttpUpgradeAdapter({ socketPath }).createRequest(request), {
        errorType: 'IncorrectUsageError',
      });
    });
  });

  describe('getJob', function () {
    it('returns jobs and unknown or expired lookups', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath });

      handler = () => ({ status: 200, body: { ...job, state: 'done' } });
      assert.equal((await adapter.getJob(key)).state, 'done');
      assert.equal(requests[0].url, `/v1/jobs/${key}`);

      handler = () => ({ status: 200, body: { id: key, state: 'expired' } });
      assert.deepEqual(await adapter.getJob(key), { id: key, state: 'expired' });
    });

    it('never sends a malformed ID to the host', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath });

      assert.deepEqual(await adapter.getJob('../status'), { id: '../status', state: 'unknown' });
      assert.equal(requests.length, 0);
    });

    it('rejects as unavailable while the host is down', async function () {
      const adapter = new HttpUpgradeAdapter({ socketPath: path.join(dir, 'nope.sock') });

      await assert.rejects(adapter.getJob(key), { code: 'unavailable' });
    });
  });
});
