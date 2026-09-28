import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import sinon from 'sinon';

const bootPath = path.join(__dirname, '../../core/boot.js');
const bootSource = readFileSync(bootPath, 'utf8');

function createBootServices() {
  const attribution = { getAttribution: sinon.stub().returns({ source: 'newsletter' }) };
  const memberAttribution = {
    service: undefined as typeof attribution | undefined,
    init() {
      this.service = attribution;
    },
  };
  const repository = {};
  const members = {
    api: undefined as { members: typeof repository } | undefined,
    init: sinon.stub().callsFake(async () => {
      // The members API captures this dependency when constructed, not on access.
      assert.equal(memberAttribution.service, attribution);
      members.api = { members: repository };
    }),
  };
  const suppression = { init: sinon.stub().resolves() };
  const analytics = { init: sinon.stub().resolves() };
  const email = {
    init: sinon.stub().callsFake(() => {
      // Newsletter sending also reads the API synchronously during initialization.
      assert.equal(members.api!.members, repository);
    }),
  };
  const independentService = { init: sinon.stub().resolves() };
  const provider = {};
  const modules = new Map<string, unknown>([
    ['./server/overrides', {}],
    ['@tryghost/debug', () => () => {}],
    ['node:assert/strict', assert],
    ['@tryghost/metrics', {}],
    ['@tryghost/domain-events', {}],
    ['./server/data/db', {}],
    ['./server/models', {}],
    ['./shared/url-utils', { default: { urlFor: () => 'https://example.com/ghost/api/admin/' } }],
    ['./shared/settings-cache', { get: () => undefined }],
    ['./server/services/member-attribution', memberAttribution],
    ['./server/services/members', members],
    ['./server/services/email-suppression-list', suppression],
    ['./server/services/email-analytics', analytics],
    ['./server/services/email-service', email],
    ['./server/services/stats', independentService],
    ['./server/services/email-provider', { init() {}, getProvider: () => provider }],
    ['./server/services/gifts', { init() {}, deliveryService: {} }],
    ['./server/services/webhooks', { listen() {} }],
    ['./server/services/automations', { automationsService: { init() {} } }],
    ['./server/services/adapter-manager', { default: { getAdapter: () => ({ run() {} }) } }],
    [
      './server/adapters/scheduling/error-capture',
      { withErrorCapture: (adapter: unknown) => adapter },
    ],
  ]);
  for (const name of ['indexnow-ping', 'slack-ping', 'post-scheduling', 'internal-keys']) {
    modules.set(`./server/services/${name}`, { default: { init() {} } });
  }

  // Execute the actual service boot phase in isolation: no DB, server, or warm
  // singleton state. Expose the private function only inside this test context.
  const initServices = runInNewContext(
    `${bootSource}\ninitServices;`,
    {
      module: { exports: {} },
      require(id: string) {
        if (!modules.has(id)) {
          assert(id.startsWith('./server/services/'), `Unexpected boot dependency: ${id}`);
          modules.set(id, { init() {} });
        }
        return modules.get(id);
      },
    },
    { filename: bootPath },
  ) as (options: { config: object }) => Promise<void>;

  return {
    start: () => initServices({ config: {} }),
    members,
    memberAttribution,
    attribution,
    repository,
    suppression,
    analytics,
    email,
    independentService,
  };
}

describe('service boot dependencies', () => {
  it('initializes attribution before members and passes the repository to email services', async () => {
    const services = createBootServices();
    assert.equal(services.memberAttribution.service, undefined);
    await services.start();
    sinon.assert.calledOnce(services.members.init);
    sinon.assert.calledOnce(services.email.init);
    sinon.assert.calledOnceWithExactly(services.suppression.init, {
      membersRepository: services.repository,
    });
    sinon.assert.calledOnceWithMatch(services.analytics.init, {
      membersRepository: services.repository,
    });
  });

  it('keeps dependent services waiting until members initialization finishes', async () => {
    const services = createBootServices();
    const started = Promise.withResolvers<void>();
    const initialized = Promise.withResolvers<void>();
    services.members.init.callsFake(async () => {
      assert.equal(services.memberAttribution.service, services.attribution);
      services.members.api = { members: services.repository };
      started.resolve();
      await initialized.promise;
    });
    const boot = services.start();
    await started.promise;
    try {
      sinon.assert.notCalled(services.independentService.init);
      sinon.assert.notCalled(services.email.init);
      sinon.assert.notCalled(services.suppression.init);
      sinon.assert.notCalled(services.analytics.init);
    } finally {
      initialized.resolve();
      await boot;
    }
    sinon.assert.calledOnce(services.suppression.init);
    sinon.assert.calledOnce(services.analytics.init);
    sinon.assert.calledOnce(services.email.init);
    sinon.assert.calledOnce(services.independentService.init);
  });

  it('propagates member initialization errors without reading an unavailable API', async () => {
    const services = createBootServices();
    const failure = new Error('members could not initialize');
    services.members.init.rejects(failure);
    await assert.rejects(services.start(), (error) => error === failure);
    sinon.assert.notCalled(services.email.init);
    sinon.assert.notCalled(services.suppression.init);
    sinon.assert.notCalled(services.analytics.init);
  });
});
