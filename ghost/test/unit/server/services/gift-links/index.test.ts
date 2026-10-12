import assert from 'node:assert/strict';
import { Frame } from '@tryghost/api-framework';
import sinon from 'sinon';

// Match the CommonJS root and consumers used by boot and the API framework.
const db = require('../../../../../core/server/data/db');
const models = require('../../../../../core/server/models');
// The access consumer imports members, which reads database metadata at import.
// Load that unrelated dependency before replacing gift-links' database binding.
require('../../../../../core/server/services/members');
const ROOT_PATH = require.resolve('../../../../../core/server/services/gift-links');
const ACCESS_PATH =
  require.resolve('../../../../../core/server/api/endpoints/utils/gift-link-access');
const CONTROLLER_PATH = require.resolve('../../../../../core/server/api/endpoints/gift-links');
const MODULE_PATHS = [ROOT_PATH, ACCESS_PATH, CONTROLLER_PATH];

type Root = typeof import('../../../../../core/server/services/gift-links');
type Access = typeof import('../../../../../core/server/api/endpoints/utils/gift-link-access');
type GiftAccessFrame = Parameters<Access['generateGiftKeyData']>[0];
type LinkRow = { post_id: string; token: string; created_at: Date };

function giftFrame(token: string): GiftAccessFrame {
  return new Frame({ context: { giftToken: token } });
}

function queryBuilder(sandbox: sinon.SinonSandbox) {
  return {
    join: sandbox.stub().returnsThis(),
    where: sandbox.stub().returnsThis(),
    first: sandbox.stub<[string[]], Promise<LinkRow | undefined>>().resolves(undefined),
    del: sandbox.stub<[], Promise<number>>().resolves(2),
  };
}

describe('gift-links root with its API consumers', function () {
  const sandbox = sinon.createSandbox();
  let originalModules: Map<string, NodeJS.Module | undefined>;
  let query: ReturnType<typeof queryBuilder>;
  let knex: sinon.SinonStub<[string], typeof query>;
  let currentKnex: typeof knex;
  let getKnex: sinon.SinonSpy<[], typeof knex>;
  let addAction: sinon.SinonStub;

  beforeEach(function () {
    originalModules = new Map(MODULE_PATHS.map((path) => [path, require.cache[path]]));
    for (const path of MODULE_PATHS) {
      delete require.cache[path];
    }
    query = queryBuilder(sandbox);
    knex = sandbox.stub<[string], typeof query>().returns(query);
    currentKnex = knex;
    getKnex = sandbox.spy(() => currentKnex);
    sandbox.stub(db, 'knex').get(getKnex);
    addAction = sandbox.stub(models.Action, 'add').resolves();
  });

  afterEach(function () {
    sandbox.restore();
    // Other loaded endpoints may retain the originals. Restore complete entries
    // so later requires reach those same roots and consumers again.
    for (const [path, original] of originalModules) {
      if (original) {
        require.cache[path] = original;
      } else {
        delete require.cache[path];
      }
    }
  });

  it('defers database binding until init and retains that binding and service on repeated init', async function () {
    const root: Root = require(ROOT_PATH);
    assert.equal(root.service, undefined);
    sinon.assert.notCalled(getKnex);
    sinon.assert.notCalled(knex);
    sinon.assert.notCalled(addAction);

    const readyKnex = sandbox.stub<[string], typeof query>().returns(query);
    currentKnex = readyKnex;
    assert.equal(root.init(), undefined);
    const service = (require(ROOT_PATH) as Root).service;
    assert.ok(service);
    sinon.assert.notCalled(readyKnex);

    currentKnex = knex;
    assert.equal(root.init(), undefined);
    assert.equal(root.service, service);
    assert.equal(await service.getPostByToken('missing-token'), null);
    sinon.assert.calledOnce(getKnex);
    sinon.assert.calledOnceWithExactly(readyKnex, 'post_gift_links');
    sinon.assert.notCalled(knex);
    sinon.assert.notCalled(addAction);
  });

  it('lets the earlier public access consumer resolve a token through the initialized service', async function () {
    const access: Access = require(ACCESS_PATH);
    const root: Root = require(ROOT_PATH);
    assert.equal(root.service, undefined);
    root.init();
    query.first.resolves({
      post_id: 'post-id',
      token: 'live-token',
      created_at: new Date('2026-01-01T00:00:00Z'),
    });

    const frame = giftFrame('live-token');
    assert.deepEqual(await access.generateGiftKeyData(frame), { present: true, postId: 'post-id' });
    assert.equal(frame.giftLinkPostId, 'post-id');
    sinon.assert.calledOnceWithExactly(knex, 'post_gift_links');
    sinon.assert.calledOnceWithExactly(query.where, 'gift_links.token', 'live-token');
    sinon.assert.calledOnce(query.first);

    query.first.resolves(undefined);
    const missing = giftFrame('missing-token');
    assert.deepEqual(await access.generateGiftKeyData(missing), { present: true, postId: null });
    assert.equal(missing.giftLinkPostId, null);
    sinon.assert.calledTwice(knex);
    sinon.assert.calledTwice(query.first);
  });

  it('passes the original query failure through the earlier public access consumer', async function () {
    const access: Access = require(ACCESS_PATH);
    const root: Root = require(ROOT_PATH);
    root.init();
    const failure = new Error('Cannot look up gift link');
    query.first.rejects(failure);
    const frame = giftFrame('live-token');

    await assert.rejects(access.generateGiftKeyData(frame), (error: unknown) => error === failure);

    assert.equal(frame.giftLinkPostId, undefined);
    sinon.assert.calledOnce(query.first);
    sinon.assert.notCalled(addAction);
  });

  it('lets the earlier Admin controller remove links and record the action through the wired model', async function () {
    const controller = require(CONTROLLER_PATH);
    const root: Root = require(ROOT_PATH);
    assert.equal(root.service, undefined);
    root.init();

    const result = await controller.removeAll.query({ options: { context: { user: 'actor-id' } } });

    assert.deepEqual(result, { count: 2 });
    sinon.assert.calledOnceWithExactly(knex, 'post_gift_links');
    sinon.assert.calledOnceWithExactly(query.del);
    sinon.assert.calledOnceWithExactly(
      addAction,
      {
        event: 'deleted',
        resource_type: 'gift_link',
        resource_id: null,
        actor_type: 'user',
        actor_id: 'actor-id',
      },
      { autoRefresh: false },
    );
  });
});
