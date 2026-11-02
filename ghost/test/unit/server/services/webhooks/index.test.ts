import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import nock from 'nock';
import sinon from 'sinon';

// require, not import: the root and its collaborators are CommonJS and the stubs below must
// land on the same module instances the root reads.
const ghostVersion = require('@tryghost/version');
const logging = require('@tryghost/logging');
const events = require('../../../../../core/server/lib/common/events');
const models = require('../../../../../core/server/models');
const { limitService } = require('../../../../../core/server/services/limits');
const urlService = require('../../../../../core/server/services/url');
const membersService = require('../../../../../core/server/services/members');
const { ADMIN } = require('../../../../../core/server/services/members-metafields');
const tiersService = require('../../../../../core/server/services/tiers').default;
const { Post } = require('../../../../../core/server/models/post');
const { Member } = require('../../../../../core/server/models/member');
const configUtils = require('../../../../utils/config-utils');
const { fixtureManager } = require('../../../../utils/e2e-framework');

const WEBHOOKS = [
  'site.changed',
  'post.added',
  'post.deleted',
  'post.edited',
  'post.published',
  'post.published.edited',
  'post.unpublished',
  'post.scheduled',
  'post.unscheduled',
  'post.rescheduled',
  'page.added',
  'page.deleted',
  'page.edited',
  'page.published',
  'page.published.edited',
  'page.unpublished',
  'page.scheduled',
  'page.unscheduled',
  'page.rescheduled',
  'tag.added',
  'tag.edited',
  'tag.deleted',
  'member.added',
  'member.deleted',
  'member.edited',
  'post.tag.attached',
  'post.tag.detached',
  'page.tag.attached',
  'page.tag.detached',
];

const LISTENER_NAME = 'processWebhookTrigger';
const RECEIVER = 'https://receiver.example';
const SECRET = 'not-a-real-webhook-secret';

type Listener = (...args: unknown[]) => void;
type Received = { headers: Record<string, string | string[] | undefined>; body: string };

function ownListeners(eventName: string | symbol): Listener[] {
  return events
    .listeners(eventName)
    .filter((listener: Listener) => listener.name === LISTENER_NAME);
}

function registeredEvents(): string[] {
  return events
    .eventNames()
    .filter((eventName: string | symbol) => ownListeners(eventName).length > 0)
    .map(String);
}

function webhookFor(event: string, path: string, secret = '') {
  const attributes: Record<string, string> = {
    event,
    target_url: `${RECEIVER}${path}`,
    secret,
  };
  return { id: `webhook-${path.slice(1)}`, get: (key: string) => attributes[key] };
}

describe('Webhooks service root', function () {
  const sandbox = sinon.createSandbox();
  const rootPath = require.resolve('../../../../../core/server/services/webhooks');
  let savedRoot: NodeJS.Module | undefined;
  let savedListeners: [string | symbol, Listener[]][];
  let savedWebhookModel: unknown;
  let Webhook: {
    findAllByEvent: sinon.SinonStub;
    edit: sinon.SinonStub;
    destroy: sinon.SinonStub;
  };

  function loadRoot() {
    return require(rootPath);
  }

  // Resolves with the arguments of the first last-triggered write, which the trigger
  // launches after a delivery settles without awaiting it. Delivering tests wait for it so
  // a late write cannot land on the next test's Webhook model.
  function nextEdit(): Promise<unknown[]> {
    return new Promise((resolve) => {
      Webhook.edit.callsFake(async (...args: unknown[]) => {
        resolve(args);
        return null;
      });
    });
  }

  function receive(path: string): Promise<Received> {
    return new Promise((resolve) => {
      nock(RECEIVER)
        .post(path)
        .reply(function (_uri, body) {
          resolve({
            headers: this.req.headers,
            body: typeof body === 'string' ? body : JSON.stringify(body),
          });
          return [200, 'OK'];
        });
    });
  }

  beforeEach(function () {
    // The unit project shares one module registry and one model event emitter, so each
    // test loads a fresh root and starts from an emitter without webhook listeners.
    savedRoot = require.cache[rootPath];
    delete require.cache[rootPath];
    savedListeners = events
      .eventNames()
      .map((eventName: string | symbol) => [eventName, ownListeners(eventName)]);
    for (const [eventName, listeners] of savedListeners) {
      for (const listener of listeners) {
        events.removeListener(eventName, listener);
      }
    }

    savedWebhookModel = models.Webhook;
    Webhook = {
      findAllByEvent: sinon.stub().resolves({ models: [] }),
      edit: sinon.stub().resolves(null),
      destroy: sinon.stub().resolves(null),
    };
    models.Webhook = Webhook;

    sandbox.stub(limitService, 'isLimited').returns(false);
    sandbox.stub(urlService, 'getRequiredRelations').returns([]);
    sandbox.stub(logging, 'info');
    sandbox.stub(logging, 'warn');
    sandbox.stub(logging, 'error');
    sandbox.stub(tiersService, 'service').get(() => ({
      api: {
        browse() {
          return {};
        },
      },
    }));
    nock.disableNetConnect();
  });

  afterEach(async function () {
    for (const eventName of registeredEvents()) {
      for (const listener of ownListeners(eventName)) {
        events.removeListener(eventName, listener);
      }
    }
    for (const [eventName, listeners] of savedListeners) {
      for (const listener of listeners) {
        events.on(eventName, listener);
      }
    }
    nock.cleanAll();
    nock.enableNetConnect();
    sandbox.restore();
    models.Webhook = savedWebhookModel;
    await configUtils.restore();
    delete require.cache[rootPath];
    if (savedRoot) {
      require.cache[rootPath] = savedRoot;
    }
  });

  it('exports only a synchronous listen that returns nothing', function () {
    const root = loadRoot();

    assert.deepEqual(Object.keys(root), ['listen']);
    assert.equal(root.listen(), undefined);
  });

  it('registers no event listeners until listen is called', function () {
    loadRoot();

    assert.deepEqual(registeredEvents(), []);
  });

  it('registers one named listener for each webhook event and nothing else', function () {
    loadRoot().listen();

    assert.deepEqual(registeredEvents().sort(), [...WEBHOOKS].sort());
    for (const eventName of WEBHOOKS) {
      assert.equal(ownListeners(eventName).length, 1, eventName);
    }
  });

  it('looks up the webhooks for the event that was emitted', function () {
    loadRoot().listen();

    for (const eventName of WEBHOOKS) {
      events.emit(eventName, { attributes: {}, _previousAttributes: {} }, {});
    }

    assert.deepEqual(
      Webhook.findAllByEvent.args.map((args) => args[0]),
      WEBHOOKS,
    );
    for (const args of Webhook.findAllByEvent.args) {
      assert.deepEqual(args[1], { context: { internal: true } });
    }
  });

  it('ignores events emitted while importing', function () {
    loadRoot().listen();

    events.emit('post.added', { attributes: {} }, { importing: true });
    sinon.assert.notCalled(Webhook.findAllByEvent);

    events.emit('post.added', { attributes: {} });
    events.emit('post.added', { attributes: {} }, { importing: false });
    sinon.assert.calledTwice(Webhook.findAllByEvent);
  });

  it('does not register a second listener when listen runs again', function () {
    // Incidental: listen.js skips an event that already has a processWebhookTrigger
    // listener, so the callbacks from the first call stay in place. The model event
    // emitter outlives test reboots and has no reset.
    const root = loadRoot();
    root.listen();
    root.listen();

    for (const eventName of WEBHOOKS) {
      assert.equal(ownListeners(eventName).length, 1, eventName);
    }

    events.emit('tag.added', { attributes: {} }, {});
    sinon.assert.calledOnce(Webhook.findAllByEvent);
  });

  it('delivers through @tryghost/request, identifying the Ghost version, when internal IPs are allowed', async function () {
    configUtils.set('security:allowWebhookInternalIPs', true);
    Webhook.findAllByEvent.resolves({ models: [webhookFor('tag.added', '/tags', SECRET)] });
    const received = receive('/tags');
    const edited = nextEdit();

    loadRoot().listen();
    events.emit('tag.added', { attributes: {}, _previousAttributes: {} }, {});

    const { headers, body } = await received;
    assert.deepEqual(JSON.parse(body), { event: 'tag.added', tag: { current: {}, previous: {} } });
    assert.equal(
      headers['user-agent'],
      `Ghost/${ghostVersion.safe} (https://github.com/TryGhost/Ghost)`,
    );
    assert.equal(headers['content-type'], 'application/json');
    assert.equal(headers['content-version'], `v${ghostVersion.safe}`);
    assert.equal(headers['content-length'], String(Buffer.byteLength(body)));

    const signature = String(headers['x-ghost-signature']).match(/^sha256=([a-f0-9]+), t=(\d+)$/);
    assert.ok(signature, 'the signature header is sha256=<hex>, t=<timestamp>');
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(`${body}${signature[2]}`)
      .digest('hex');
    assert.equal(signature[1], expected);

    const [data, options] = await edited;
    assert.equal((data as Record<string, unknown>).last_triggered_status, 200);
    assert.equal((data as Record<string, unknown>).last_triggered_error, null);
    assert.deepEqual(options, { id: 'webhook-tags', autoRefresh: false });
  });

  it('delivers through request-external when internal IPs are not allowed', async function () {
    configUtils.set('security:allowWebhookInternalIPs', false);
    // Development skips request-external's private-address checks, which need DNS.
    configUtils.set('env', 'development');
    Webhook.findAllByEvent.resolves({ models: [webhookFor('tag.added', '/external')] });
    const received = receive('/external');
    const edited = nextEdit();

    loadRoot().listen();
    events.emit('tag.added', { attributes: {}, _previousAttributes: {} }, {});

    const { headers } = await received;
    assert.equal(headers['user-agent'], 'Ghost(https://github.com/TryGhost/Ghost)');
    assert.equal(headers['content-version'], `v${ghostVersion.safe}`);
    assert.equal(headers['x-ghost-signature'], undefined);
    await edited;
  });

  it('serializes a post with the relations the URL service reads when the event arrives', async function () {
    configUtils.set('security:allowWebhookInternalIPs', true);
    Webhook.findAllByEvent.resolves({ models: [webhookFor('post.published', '/posts')] });
    const received = receive('/posts');
    const edited = nextEdit();

    loadRoot().listen();
    // Read when the event is serialized, not when listen ran.
    (urlService.getRequiredRelations as sinon.SinonStub).returns(['tags']);
    const post = fixtureManager.get('posts', 1);
    const postModel = new Post(post);
    postModel.relations = { authors: {} };
    const load = sinon.stub(postModel, 'load').resolves(postModel);
    events.emit('post.published', postModel, {});

    const body = JSON.parse((await received).body);
    sinon.assert.calledWith(load, ['tags']);
    assert.equal(body.event, 'post.published');
    assert.equal(body.post.current.id, post.id);
    assert.equal(body.post.current.title, post.title);
    assert.deepEqual(body.post.previous, {});
    await edited;
  });

  describe('member events', function () {
    function memberModel() {
      const model = new Member({
        id: 'member-id',
        uuid: 'member-uuid',
        email: 'member@example.com',
        status: 'free',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      });
      sinon.stub(model, 'load').resolves(model);
      return model;
    }

    it('reads the member’s Admin metafields from the members API current when the event arrives', async function () {
      configUtils.set('security:allowWebhookInternalIPs', true);
      Webhook.findAllByEvent.resolves({ models: [webhookFor('member.added', '/members')] });
      const received = receive('/members');
      const edited = nextEdit();

      loadRoot().listen();
      const readMetafieldsForMember = sinon
        .stub()
        .resolves({ custom: { favourite_colour: 'teal' } });
      sandbox
        .stub(membersService, 'api')
        .get(() => ({ memberBREADService: { readMetafieldsForMember } }));
      events.emit('member.added', memberModel(), {});

      const body = JSON.parse((await received).body);
      sinon.assert.calledOnceWithExactly(readMetafieldsForMember, 'member-id', ADMIN);
      assert.equal(body.member.current.email, 'member@example.com');
      assert.deepEqual(body.member.current.metafields, { custom: { favourite_colour: 'teal' } });
      await edited;
    });

    it('leaves metafields off a member with none', async function () {
      configUtils.set('security:allowWebhookInternalIPs', true);
      Webhook.findAllByEvent.resolves({ models: [webhookFor('member.added', '/members')] });
      const received = receive('/members');
      const edited = nextEdit();

      loadRoot().listen();
      const readMetafieldsForMember = sinon.stub().resolves({});
      sandbox
        .stub(membersService, 'api')
        .get(() => ({ memberBREADService: { readMetafieldsForMember } }));
      events.emit('member.added', memberModel(), {});

      const body = JSON.parse((await received).body);
      assert.equal(body.member.current.email, 'member@example.com');
      assert.equal(Object.hasOwn(body.member.current, 'metafields'), false);
      await edited;
    });
  });
});
