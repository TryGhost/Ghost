import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sinon from 'sinon';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

// Required, not imported, so these are the module instances Ghost uses at runtime.
const { UpgradeAdapterError } = require('@tryghost/adapter-base-upgrade');
const jwt = require('jsonwebtoken');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const db = require('../../../core/server/data/db');
const spamPrevention = require('../../../core/server/web/shared/middleware/api/spam-prevention');

const id = 'f76543a0-c052-45e8-b020-03c86a809b93';
const input = { component: 'ghost', to_version: '6.71.0', idempotency_key: id };
const timestamp = '2026-10-14T12:00:00.000Z';

const job = {
  id,
  state: 'pending',
  component: 'ghost',
  fromVersion: '6.70.0',
  toVersion: '6.71.0',
  createdAt: timestamp,
  updatedAt: timestamp,
};
const apiJob = {
  id,
  state: 'pending',
  component: 'ghost',
  from_version: '6.70.0',
  to_version: '6.71.0',
  created_at: timestamp,
  updated_at: timestamp,
};

const status = {
  supported: true,
  availability: 'ready',
  backupRequired: true,
  currentVersion: '6.70.0',
  oneClick: [{ component: 'ghost', fromVersion: '6.70.0', toVersion: '6.71.0' }],
  manual: [
    {
      component: 'stack',
      fromVersion: '1.2.0',
      toVersion: '1.3.0',
      reason: 'Stack updates replace the supervisor.',
      steps: ['./ghost-docker self-update'],
    },
  ],
  activeJobId: null,
  pollAfterMs: 2000,
};
const apiStatus = {
  supported: true,
  availability: 'ready',
  backup_required: true,
  current_version: '6.70.0',
  one_click: [{ component: 'ghost', from_version: '6.70.0', to_version: '6.71.0' }],
  manual: [
    {
      component: 'stack',
      from_version: '1.2.0',
      to_version: '1.3.0',
      reason: 'Stack updates replace the supervisor.',
      steps: ['./ghost-docker self-update'],
    },
  ],
  active_job_id: null,
  poll_after_ms: 2000,
};

type Method = 'get' | 'post';
const routes: Array<[Method, string]> = [
  ['get', 'upgrades/'],
  ['post', 'upgrades/'],
  ['get', `upgrades/${id}/`],
];

function useAdapter(adapter: Record<string, sinon.SinonStub | (() => Promise<unknown>)>) {
  sinon.stub(adapterManager, 'getAdapter').withArgs('upgrade').returns(adapter);
}

describe('Upgrades API', function () {
  let agent: any;

  const post = (body: unknown) => agent.post('upgrades/').body(body);

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'integrations', 'api_keys');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await db.knex('brute').delete();
    await agent.loginAsOwner();
  });

  afterEach(function () {
    sinon.restore();
    adapterManager.clearCache();
  });

  it('reports the default adapter as not configured', async function () {
    const { body } = await agent.get('upgrades/').expectStatus(200);
    assert.deepEqual(body, { upgrades: [{ supported: false, reason: 'not-configured' }] });

    const rejection = await post({ upgrades: [input] }).expectStatus(409);
    assert.equal(rejection.body.errors[0].code, 'UPGRADE_UNSUPPORTED');

    const lookup = await agent.get(`upgrades/${id}/`).expectStatus(200);
    assert.deepEqual(lookup.body, { upgrades: [{ id, state: 'unknown' }] });
  });

  it('maps status and jobs to snake_case and strips undeclared fields', async function () {
    const createRequest = sinon.stub().resolves(job);
    const getJob = sinon.stub();
    useAdapter({
      getStatus: async () => ({ ...status, image: 'ghost@sha256:abc' }),
      createRequest,
      getJob,
    });

    const found = await agent.get('upgrades/').expectStatus(200);
    assert.deepEqual(found.body, { upgrades: [apiStatus] });

    const accepted = await post({ upgrades: [input] }).expectStatus(202);
    assert.deepEqual(accepted.body, { upgrades: [apiJob] });
    assert.equal(createRequest.firstCall.args[0].component, 'ghost');
    assert.equal(createRequest.firstCall.args[0].toVersion, '6.71.0');
    assert.match(createRequest.firstCall.args[0].idempotencyKey, /^[a-f0-9]{64}$/);

    for (const state of [
      'restarting',
      'done',
      'restored',
      'needs-operator',
      'refused',
      'interrupted',
    ]) {
      getJob.resolves({ ...job, state, error: '/private/secret' });
      const result = await agent.get(`upgrades/${id}/`).expectStatus(200);
      assert.deepEqual(result.body, { upgrades: [{ ...apiJob, state }] });
    }
    for (const state of ['unknown', 'expired']) {
      getJob.resolves({ id, state });
      const result = await agent.get(`upgrades/${id}/`).expectStatus(200);
      assert.deepEqual(result.body, { upgrades: [{ id, state }] });
    }
  });

  it('passes prerelease and nightly versions through unchanged', async function () {
    const createRequest = sinon.stub();
    useAdapter({ createRequest });

    for (const toVersion of [
      '7.0.0-rc.1',
      '6.71.0-nightly.20261014+abcdef',
      'nightly-2026-10-14',
    ]) {
      createRequest.resolves({ ...job, toVersion });
      const { body } = await post({
        upgrades: [{ ...input, to_version: toVersion, idempotency_key: randomUUID() }],
      }).expectStatus(202);
      assert.equal(body.upgrades[0].to_version, toVersion);
    }
  });

  it('validates requests and job IDs before calling the adapter', async function () {
    const createRequest = sinon.stub();
    const getJob = sinon.stub();
    useAdapter({ createRequest, getJob });

    await agent.get('upgrades/Not_A_Job/').expectStatus(422);
    await agent.get(`upgrades/${'a'.repeat(65)}/`).expectStatus(422);
    await agent.get(`upgrades/${id.toUpperCase()}/`).expectStatus(422);

    const invalidBodies = [
      {},
      { upgrades: [] },
      { upgrades: [input, input] },
      { upgrades: [input], command: 'x' },
      { upgrades: [{ to_version: '6.71.0', idempotency_key: id }] },
      { upgrades: [{ ...input, idempotency_key: 'not-a-uuid' }] },
      { upgrades: [{ ...input, idempotency_key: id.toUpperCase() }] },
      { upgrades: [{ ...input, idempotency_key: id.replace('-45e8-', '-15e8-') }] },
      { upgrades: [{ ...input, component: 'Ghost' }] },
      { upgrades: [{ component: 'ghost', toVersion: '6.71.0', idempotencyKey: id }] },
      ...['', 'x'.repeat(129), 123, null].map((toVersion) => ({
        upgrades: [{ ...input, to_version: toVersion }],
      })),
      ...['image', 'id', 'command', 'skip_backup', 'user_id'].map((key) => ({
        upgrades: [{ ...input, [key]: 'x' }],
      })),
    ];

    for (const body of invalidBodies) {
      await db.knex('brute').delete();
      await post(body).expectStatus(422);
    }

    sinon.assert.notCalled(createRequest);
    sinon.assert.notCalled(getJob);
  });

  it('maps host rejections and returns their diagnostics', async function () {
    const diagnostics = [
      {
        source: 'host',
        code: 'major-update',
        severity: 'error',
        message: 'Major updates must be run on the host.',
        help: 'https://ghost.org/docs/update/',
      },
    ];
    const createRequest = sinon
      .stub()
      .rejects(new UpgradeAdapterError({ code: 'target-unapproved', diagnostics }));
    useAdapter({ createRequest });

    const rejection = await post({ upgrades: [input] }).expectStatus(422);
    assert.equal(rejection.body.errors[0].code, 'UPGRADE_TARGET_UNAPPROVED');
    assert.deepEqual(rejection.body.errors[0].details, { diagnostics });

    await db.knex('brute').delete();
    createRequest.rejects(new UpgradeAdapterError({ code: 'busy' }));
    const busy = await post({ upgrades: [input] }).expectStatus(409);
    assert.equal(busy.body.errors[0].code, 'UPGRADE_BUSY');
  });

  it('reports adapter failures as an unavailable host without leaking details', async function () {
    useAdapter({
      getStatus: sinon.stub().rejects(new Error('EACCES /srv/exchange/status.json')),
    });

    // A 503 would read to Admin as Ghost itself being under maintenance.
    const { body } = await agent.get('upgrades/').expectStatus(200);
    assert.deepEqual(body, {
      upgrades: [{ supported: true, availability: 'unavailable', one_click: [], manual: [] }],
    });
  });

  it('answers an unreachable host with 502, never the 503 Admin reads as maintenance', async function () {
    useAdapter({
      createRequest: sinon.stub().rejects(new UpgradeAdapterError({ code: 'unavailable' })),
      getJob: sinon.stub().rejects(new Error('ECONNREFUSED')),
    });

    const request = await post({ upgrades: [input] }).expectStatus(502);
    assert.equal(request.body.errors[0].code, 'UPGRADE_UNAVAILABLE');

    const lookup = await agent.get(`upgrades/${id}/`).expectStatus(502);
    assert.equal(lookup.body.errors[0].code, 'UPGRADE_UNAVAILABLE');
  });

  it('shares an IP budget across all upgrade routes, enforced before authentication', async function () {
    const limiter = spamPrevention.upgradeApiBlock();
    sinon.stub(limiter, 'options').value({ ...limiter.options, freeRetries: 2 });
    const startTime = Date.now();
    const now = sinon.stub(limiter, 'now').returns(startTime);
    const anonymous = (method: Method, path: string, ip: string) =>
      agent[method](path)
        .header('Authorization', 'Ghost not-a-token')
        .header('X-Forwarded-For', ip);

    for (const [method, path] of routes) {
      await anonymous(method, path, '203.0.113.1').expectStatus(400);
    }

    const decode = sinon.spy(jwt, 'decode');
    for (const [method, path] of routes) {
      await anonymous(method, path, '203.0.113.1').expectStatus(429);
    }
    sinon.assert.notCalled(decode);

    await anonymous('get', 'upgrades/', '203.0.113.2').expectStatus(400);
    sinon.assert.calledOnce(decode);

    // Polling resumes in the next window rather than after a full idle minute.
    now.returns(startTime + 60001);
    await anonymous('get', 'upgrades/', '203.0.113.1').expectStatus(400);
    sinon.assert.calledTwice(decode);
  });

  it('limits POSTs per staff user without blocking polling', async function () {
    for (let index = 0; index < 3; index++) {
      await post({ upgrades: [input] }).expectStatus(409);
    }

    const rejected = await post({ upgrades: [input] }).expectStatus(429);
    assert.ok(Number(rejected.headers['retry-after']) >= 1);
    assert.match(rejected.body.errors[0].help, /original idempotency_key/);

    await agent.get('upgrades/').expectStatus(200);
    await agent.get(`upgrades/${id}/`).expectStatus(200);
  });

  it('permits administrators and owner staff tokens', async function () {
    useAdapter({
      getStatus: async () => status,
      getJob: async () => ({ id, state: 'unknown' }),
      createRequest: async () => job,
    });

    await agent.loginAsAdmin();
    await agent.get('upgrades/').expectStatus(200);
    await agent.get(`upgrades/${id}/`).expectStatus(200);
    await post({ upgrades: [input] }).expectStatus(202);

    await agent.useStaffTokenForOwner();
    await agent.get('upgrades/').expectStatus(200);
    await agent.get(`upgrades/${id}/`).expectStatus(200);
  });

  for (const role of ['Editor', 'Author', 'Contributor', 'SuperEditor']) {
    it(`denies ${role} every endpoint`, async function () {
      if (role === 'SuperEditor') {
        await agent.loginAs(null, null, 'superEditor');
      } else {
        await agent[`loginAs${role}`]();
      }

      await agent.get('upgrades/').expectStatus(403);
      await agent.get(`upgrades/${id}/`).expectStatus(403);
      await post({ upgrades: [input] }).expectStatus(403);
    });
  }

  it('denies integration tokens', async function () {
    await agent.useZapierAdminAPIKey();

    await agent.get('upgrades/').expectStatus(403);
    await agent.get(`upgrades/${id}/`).expectStatus(403);
    await post({ upgrades: [input] }).expectStatus(403);
  });

  // Last: a new agent resets the fixtures the shared agent logs in with.
  it('requires authentication', async function () {
    const anonymous = await agentProvider.getAdminAPIAgent();

    await anonymous.get('upgrades/').expectStatus(403);
    await anonymous.get(`upgrades/${id}/`).expectStatus(403);
    await anonymous
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(403);
  });
});
