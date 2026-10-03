const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const { UpgradeAdapterError } = require('@tryghost/adapter-base-upgrade');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const manager = require('../../../core/server/services/adapter-manager').default;
const db = require('../../../core/server/data/db');
const spamPrevention = require('../../../core/server/web/shared/middleware/api/spam-prevention');

const id = 'f76543a0-c052-45e8-b020-03c86a809b93';
const input = { target_version: '6.65.0', idempotency_key: id };
const job = {
  id,
  targetVersion: '6.65.0',
  state: 'queued',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};

const status = {
  supported: true,
  availability: 'ready',
  currentVersion: '6.64.0',
  targets: [{ version: '6.65.0' }],
  backupRequired: true,
  activeJobId: null,
  pollAfterMs: 2000,
};

const apiJob = {
  id,
  target_version: '6.65.0',
  state: 'queued',
  created_at: '2026-09-29T12:00:00.000Z',
  updated_at: '2026-09-29T12:00:00.000Z',
};

const apiStatus = {
  supported: true,
  availability: 'ready',
  current_version: '6.64.0',
  targets: [{ version: '6.65.0' }],
  backup_required: true,
  active_job_id: null,
  poll_after_ms: 2000,
};

describe('Upgrades API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'integrations', 'api_keys');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await db.knex('brute').delete();
  });

  afterEach(function () {
    sinon.restore();
    manager.clearCache();
  });

  it('returns the normal default wrapper', async function () {
    const response = await agent.get('upgrades/').expectStatus(200);
    assert.deepEqual(response.body, {
      upgrades: [{ supported: false, reason: 'not-configured' }],
    });
    await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(409);
  });

  it('accepts an intent key, returns 202, and reads explicit job states', async function () {
    const createRequest = sinon.stub().resolves(job);
    const getJob = sinon.stub().resolves({ id, state: 'unknown' });
    sinon
      .stub(manager, 'getAdapter')
      .withArgs('upgrade')
      .returns({ getStatus: async () => status, createRequest, getJob });

    const response = await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(202);
    assert.deepEqual(response.body, {
      upgrades: [apiJob],
    });
    assert.equal(createRequest.firstCall.args[0].targetVersion, input.target_version);
    assert.match(createRequest.firstCall.args[0].idempotencyKey, /^[a-f0-9]{64}$/);

    for (const state of ['unknown', 'expired', 'done', 'rolled-back', 'recovery-required']) {
      getJob.resolves({ id, state, error: '/private/secret' });
      const result = await agent.get(`upgrades/${id}/`).expectStatus(200);
      assert.deepEqual(result.body, { upgrades: [{ id, state }] });
    }
  });

  it('accepts host-approved prerelease and nightly identifiers without altering them', async function () {
    const getStatus = sinon.stub();
    const createRequest = sinon.stub();
    sinon.stub(manager, 'getAdapter').withArgs('upgrade').returns({ getStatus, createRequest });
    for (const targetVersion of [
      '7.0.0-rc.1',
      '6.65.0-nightly.20260929+abcdef',
      'nightly-2026-09-29',
    ]) {
      const discovery = {
        ...status,
        currentVersion: '6.64.0-nightly.20260928',
        targets: [{ version: targetVersion }],
      };
      getStatus.resolves(discovery);
      const found = await agent.get('upgrades/').expectStatus(200);
      assert.deepEqual(found.body, {
        upgrades: [
          { ...apiStatus, current_version: discovery.currentVersion, targets: discovery.targets },
        ],
      });
      const accepted = { ...job, targetVersion };
      createRequest.resolves(accepted);
      const response = await agent
        .post('upgrades/')
        .body({ upgrades: [{ target_version: targetVersion, idempotency_key: randomUUID() }] })
        .expectStatus(202);
      assert.deepEqual(response.body, { upgrades: [{ ...apiJob, target_version: targetVersion }] });
      assert.equal(createRequest.lastCall.args[0].targetVersion, targetVersion);
    }
  });

  it('validates requests and IDs before calling the service and rejects host rejections', async function () {
    const createRequest = sinon.stub().rejects(new UpgradeAdapterError({ code: 'busy' }));
    sinon.stub(manager, 'getAdapter').withArgs('upgrade').returns({ createRequest });
    await agent.get('upgrades/not-a-uuid/').expectStatus(422);
    const invalidBodies = [
      { upgrades: [{ target_version: '6.65.0' }] },
      { upgrades: [{ ...input, idempotency_key: 'not-a-uuid' }] },
      { upgrades: [input], command: 'x' },
      { upgrades: [{ targetVersion: '6.65.0', idempotencyKey: id }] },
      { upgrades: [{ ...input, idempotency_key: id.toUpperCase() }] },
      { upgrades: [{ ...input, idempotency_key: id.replace('-45e8-', '-15e8-') }] },
      { upgrades: [] },
      { upgrades: [input, input] },
      ...['', 'x'.repeat(129), 123, null].map((targetVersion) => ({
        upgrades: [{ ...input, target_version: targetVersion }],
      })),
      ...['image', 'id', 'command', 'path', 'skipBackup', 'allowMajorUpgrade', 'userId'].map(
        (key) => ({ upgrades: [{ ...input, [key]: 'x' }] }),
      ),
    ];

    for (const body of invalidBodies) {
      await db.knex('brute').delete();
      await agent.post('upgrades/').body(body).expectStatus(422);
    }

    sinon.assert.notCalled(createRequest);
    await db.knex('brute').delete();
    await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(409);
    createRequest.rejects(new UpgradeAdapterError({ code: 'target-unapproved' }));
    await agent
      .post('upgrades/')
      .body({ upgrades: [{ ...input, target_version: '6.66.0' }] })
      .expectStatus(422);
  });

  it('returns descriptive compatibility diagnostics in rejected checks and job results', async function () {
    const diagnostics = [
      {
        source: 'gscan',
        code: 'GS001',
        severity: 'error',
        message: 'The theme uses a removed helper.',
        details: 'Replace it before updating.',
        locations: [{ file: 'post.hbs', line: 12 }],
      },
      {
        source: 'backup',
        code: 'low-space',
        severity: 'warning',
        message: 'Available disk space is close to the backup requirement.',
      },
    ];
    sinon
      .stub(manager, 'getAdapter')
      .withArgs('upgrade')
      .returns({
        createRequest: async () => {
          throw new UpgradeAdapterError({ code: 'checks-failed', diagnostics });
        },
        getJob: async () => ({ ...job, state: 'blocked', diagnostics }),
      });
    const rejection = await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(422);
    assert.deepEqual(rejection.body.errors[0].details, { diagnostics });
    const result = await agent.get(`upgrades/${id}/`).expectStatus(200);
    assert.deepEqual(result.body.upgrades[0].diagnostics, diagnostics);
  });

  it('shares an IP budget across all upgrade routes and rejects excess requests before authentication', async function () {
    const limiter = spamPrevention.upgradeApiBlock();
    sinon.stub(limiter, 'options').value({ ...limiter.options, freeRetries: 2 });
    const startTime = Date.now();
    const now = sinon.stub(limiter, 'now').returns(startTime);

    for (const [method, path] of [
      ['get', 'upgrades/'],
      ['post', 'upgrades/'],
      ['get', `upgrades/${id}/`],
    ]) {
      await agent[method](path)
        .header('Authorization', 'Ghost not-a-token')
        .header('X-Forwarded-For', '203.0.113.1')
        .expectStatus(400);
    }

    const decode = sinon.spy(jwt, 'decode');

    for (const [method, path] of [
      ['get', 'upgrades/'],
      ['post', 'upgrades/'],
      ['get', `upgrades/${id}/`],
    ]) {
      await agent[method](path)
        .header('Authorization', 'Ghost not-a-token')
        .header('X-Forwarded-For', '203.0.113.1')
        .expectStatus(429);
    }

    sinon.assert.notCalled(decode);

    await agent
      .get('upgrades/')
      .header('Authorization', 'Ghost not-a-token')
      .header('X-Forwarded-For', '203.0.113.2')
      .expectStatus(400);

    sinon.assert.calledOnce(decode);

    // Normal polling can resume in the next window without a full idle minute.
    now.returns(startTime + 60001);
    await agent
      .get('upgrades/')
      .header('Authorization', 'Ghost not-a-token')
      .header('X-Forwarded-For', '203.0.113.1')
      .expectStatus(400);

    sinon.assert.calledTwice(decode);
  });

  it('throttles repeated POSTs', async function () {
    for (let index = 0; index < 3; index++) {
      await agent
        .post('upgrades/')
        .body({ upgrades: [input] })
        .expectStatus(409);
    }
    const rejected = await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(429);
    assert.ok(Number(rejected.headers['retry-after']) >= 1);
    assert.match(rejected.body.errors[0].help, /original request key/);
  });

  it('continues polling after the staff POST budget is exhausted', async function () {
    for (let index = 0; index < 3; index++) {
      await agent
        .post('upgrades/')
        .body({ upgrades: [input] })
        .expectStatus(409);
    }

    await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(429);

    for (let index = 0; index < 5; index++) {
      await agent.get('upgrades/').expectStatus(200);
      await agent.get(`upgrades/${id}/`).expectStatus(200);
    }
  });

  it('permits administrators', async function () {
    sinon
      .stub(manager, 'getAdapter')
      .withArgs('upgrade')
      .returns({
        getStatus: async () => status,
        getJob: async () => ({ id, state: 'unknown' }),
        createRequest: async () => job,
      });
    await agent.loginAsAdmin();
    await agent.get('upgrades/').expectStatus(200);
    await agent.get(`upgrades/${id}/`).expectStatus(200);
    await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(202);
    await agent.loginAsOwner();
  });

  for (const role of ['Editor', 'Author', 'Contributor', 'SuperEditor']) {
    it(`denies ${role} all endpoints`, async function () {
      if (role === 'SuperEditor') {
        await agent.loginAs(null, null, 'superEditor');
      } else {
        await agent[`loginAs${role}`]();
      }
      await agent.get('upgrades/').expectStatus(403);
      await agent.get(`upgrades/${id}/`).expectStatus(403);
      await agent
        .post('upgrades/')
        .body({ upgrades: [input] })
        .expectStatus(403);
      await agent.loginAsOwner();
      for (let index = 0; index < 3; index++) {
        await agent
          .post('upgrades/')
          .body({ upgrades: [input] })
          .expectStatus(409);
      }
    });
  }

  it('rejects integration tokens for all endpoints', async function () {
    await agent.useZapierAdminAPIKey();
    await agent.get('upgrades/').expectStatus(403);
    await agent.get(`upgrades/${id}/`).expectStatus(403);
    await agent
      .post('upgrades/')
      .body({ upgrades: [input] })
      .expectStatus(403);
    await agent.loginAsOwner();
  });

  it('accepts an owner staff token', async function () {
    await agent.useStaffTokenForOwner();
    await agent.get('upgrades/').expectStatus(200);
    await agent.get(`upgrades/${id}/`).expectStatus(200);
    await agent.loginAsOwner();
  });

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
