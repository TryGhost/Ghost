import fs from 'node:fs';
import path from 'node:path';
import {
  FakeUpgradeHost,
  type ResponseKind,
  responseSchemas,
} from '@/helpers/services/upgrade/fake-upgrade-host';
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Copies of ghost-docker's protocol fixtures, shared with Ghost's adapter tests.
const FIXTURES = fileURLToPath(
  new URL('../../../ghost/test/utils/fixtures/upgrade-supervisor', import.meta.url),
);

const kindByPrefix: Record<string, ResponseKind | 'request'> = {
  handshake: 'handshake',
  status: 'status',
  job: 'job',
  lookup: 'lookup',
  error: 'error',
  request: 'request',
};

function fixtures(validity: 'valid' | 'invalid') {
  return fs.readdirSync(path.join(FIXTURES, validity)).map((file) => ({
    file,
    kind: kindByPrefix[file.split('-')[0].replace('.json', '')],
    body: JSON.parse(fs.readFileSync(path.join(FIXTURES, validity, file), 'utf8')) as unknown,
  }));
}

function responseFixtures(validity: 'valid' | 'invalid') {
  return fixtures(validity).flatMap(({ file, kind, body }) => {
    return kind === 'request' ? [] : [{ file, kind, body }];
  });
}

function requestFixtures(validity: 'valid' | 'invalid') {
  return fixtures(validity).filter(({ kind }) => kind === 'request');
}

async function call(base: string, method: string, route: string, body?: unknown) {
  const response = await fetch(`${base}${route}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

test.describe('Fake upgrade host - protocol fixtures', () => {
  test('every fixture has a known kind', () => {
    for (const fixture of [...fixtures('valid'), ...fixtures('invalid')]) {
      expect(fixture.kind, fixture.file).toBeDefined();
    }
  });

  test('the response schemas accept the valid fixtures and refuse the invalid ones', () => {
    for (const { file, kind, body } of responseFixtures('valid')) {
      expect(responseSchemas[kind].safeParse(body).success, file).toBe(true);
    }
    for (const { file, kind, body } of responseFixtures('invalid')) {
      expect(responseSchemas[kind].safeParse(body).success, file).toBe(false);
    }
  });

  test.describe('over HTTP', () => {
    let base: string;
    let host: FakeUpgradeHost;

    test.beforeEach(async () => {
      // The fixtures' versions, so their requests are offered as one-click.
      host = new FakeUpgradeHost({ currentVersion: '6.68.0', targetVersion: '6.72.0' });
      await host.start();
      base = `http://127.0.0.1:${host.port}`;
    });

    test.afterEach(async () => {
      await host.stop();
      expect(host.violations).toEqual([]);
    });

    test('answers the handshake and a status the fixtures describe', async () => {
      const handshake = await call(base, 'GET', '/v1');
      expect(handshake).toEqual({ status: 200, body: { protocol: 1 } });

      const status = await call(base, 'GET', '/v1/status');
      expect(status.status).toBe(200);
      expect(status.body).toMatchObject({
        supported: true,
        availability: 'ready',
        currentVersion: '6.68.0',
        oneClick: [{ component: 'ghost', fromVersion: '6.68.0', toVersion: '6.72.0' }],
      });
    });

    test('accepts the valid request, replays it, and refuses the invalid ones', async () => {
      const [request] = requestFixtures('valid');

      const accepted = await call(base, 'POST', '/v1/requests', request.body);
      expect(accepted.status).toBe(202);
      expect(accepted.body).toMatchObject({ state: 'pending', toVersion: '6.72.0' });

      const replay = await call(base, 'POST', '/v1/requests', request.body);
      expect(replay.status).toBe(200);
      expect(replay.body).toMatchObject({ id: (accepted.body as { id: string }).id });

      for (const { file, body } of requestFixtures('invalid')) {
        const refused = await call(base, 'POST', '/v1/requests', body);
        expect(refused, file).toEqual({ status: 400, body: { error: { code: 'malformed' } } });
      }
    });

    test('answers transport failures with the documented codes', async () => {
      expect(await call(base, 'GET', '/v2')).toEqual({
        status: 404,
        body: { error: { code: 'not-found' } },
      });
      expect(await call(base, 'DELETE', '/v1/status')).toEqual({
        status: 405,
        body: { error: { code: 'method-not-allowed' } },
      });
      expect(await call(base, 'GET', '/v1/jobs/NOT_AN_ID')).toEqual({
        status: 400,
        body: { error: { code: 'malformed' } },
      });
      expect(await call(base, 'POST', '/v1/requests', { component: 'x'.repeat(5000) })).toEqual({
        status: 413,
        body: { error: { code: 'too-large' } },
      });
      expect(await call(base, 'GET', '/v1/jobs/abc')).toEqual({
        status: 200,
        body: { id: 'abc', state: 'unknown' },
      });
    });

    test('walks a job through its stages by hand to the configured outcome', async () => {
      host.configure({ stageMs: null, outcome: 'restored' });
      const key = 'a'.repeat(64);
      await call(base, 'POST', '/v1/requests', {
        component: 'ghost',
        toVersion: '6.72.0',
        idempotencyKey: key,
      });

      const states = [];
      for (let stage = 0; stage < 4; stage += 1) {
        states.push(host.advance().state);
      }
      expect(states).toEqual(['pulling', 'backing-up', 'restoring', 'restored']);

      const lookup = await call(base, 'GET', `/v1/jobs/${key}`);
      expect(lookup.body).toMatchObject({
        state: 'restored',
        diagnostics: [{ code: 'verify-failed' }],
      });
      const status = await call(base, 'GET', '/v1/status');
      // A failed update leaves the site on its version, so the update is still offered.
      expect(status.body).toMatchObject({ availability: 'ready', currentVersion: '6.68.0' });
    });
  });
});
