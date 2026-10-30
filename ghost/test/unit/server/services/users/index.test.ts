import assert from 'node:assert/strict';
import { IncorrectUsageError, NotFoundError as UserNotFoundError } from '@tryghost/errors';
import sinon from 'sinon';

// require, not import: the service and its endpoints are CommonJS and must share these
// module instances so prototype stubs and instanceof checks observe the real composition.
const { PostsBulkAddTagsEvent } = require('../../../../../core/shared/events-ts');
const { PostRevisions } = require('../../../../../core/server/lib/post-revisions');
const models = require('../../../../../core/server/models');
const auth = require('../../../../../core/server/auth');
const { UsersService: Users } = require('../../../../../core/server/services/users/users-service');
const ROOT_PATH = require.resolve('../../../../../core/server/services/users');
const USERS_ENDPOINT_PATH = require.resolve('../../../../../core/server/api/endpoints/users');
const AUTHENTICATION_ENDPOINT_PATH =
  require.resolve('../../../../../core/server/api/endpoints/authentication');

type Row = { post_id: string };
type Call = { table: string; method: string; args: unknown[] };

// A thenable knex query builder: every builder method records its call and returns the
// builder, and awaiting the builder resolves the table's rows (or nothing after an insert).
function createKnex(rows: { posts_authors: Row[]; posts_tags: Row[] }) {
  const calls: Call[] = [];
  const inserted: Array<Record<string, unknown>> = [];
  const knex = (table: keyof typeof rows) => {
    let result: unknown = rows[table];
    const builder: Record<string, (...args: never[]) => unknown> = {};
    for (const method of ['transacting', 'where', 'whereIn', 'select', 'forUpdate']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.insert = (newRows: unknown) => {
      calls.push({ table, method: 'insert', args: [newRows] });
      inserted.push(...(newRows as Array<Record<string, unknown>>));
      result = undefined;
      return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return builder;
  };
  return { knex, calls, inserted };
}

function createModels({
  userPostIds = ['post-1', 'post-2'],
  taggedPostIds = [] as string[],
  existingTag = true,
} = {}) {
  const transaction = { label: 'service transaction' };
  const { knex, calls, inserted } = createKnex({
    posts_authors: userPostIds.map((post_id) => ({ post_id })),
    posts_tags: taggedPostIds.map((post_id) => ({ post_id })),
  });
  const author = { get: (key: string) => (key === 'slug' ? 'author-slug' : undefined) };
  const tag = { get: (key: string) => (key === 'id' ? 'tag-id' : undefined) };
  // Tracks whether the service's own transaction is still open when each stage runs.
  const state = { open: false, settled: false };
  const whileOpen = <T>(stub: sinon.SinonStub<unknown[], Promise<T>>, value: T) =>
    stub.callsFake(() => {
      assert.equal(state.open, true, 'expected the stage to run inside the transaction');
      return Promise.resolve(value);
    });
  class NotFoundError extends Error {}
  const fakes = {
    Base: {
      knex,
      transaction: sinon.stub().callsFake(async (run: (tx: object) => Promise<unknown>) => {
        state.open = true;
        try {
          return await run(transaction);
        } finally {
          state.open = false;
          state.settled = true;
        }
      }),
    },
    User: {
      findOne: sinon.stub().resolves(author),
      findAll: sinon.stub().resolves({ models: [] }),
      destroy: whileOpen(sinon.stub(), undefined),
    },
    Tag: {
      findOne: sinon.stub().resolves(existingTag ? tag : null),
      add: sinon.stub().resolves(tag),
    },
    Post: {
      addActions: sinon.stub().resolves(),
      reassignByAuthor: whileOpen(sinon.stub(), undefined),
      // Row locking helper used by newer deletion code paths; nothing here asserts on it.
      lockLinkedForUpdate: sinon.stub().resolves([]),
    },
    ApiKey: {
      destroy: whileOpen(sinon.stub(), undefined),
      NotFoundError,
    },
    PostRevision: {
      findAll: sinon.stub().resolves({ toJSON: () => [] }),
      bulkEdit: sinon.stub().resolves(),
    },
  };
  return { models: fakes, transaction, calls, inserted, state };
}

type Root = (typeof import('../../../../../core/server/services/users'))['default'];

describe('Users service', function () {
  const sandbox = sinon.createSandbox();
  let dispatch: sinon.SinonStub;

  function createService(fakes: ReturnType<typeof createModels>['models']) {
    return new Users({
      models: fakes,
      DomainEvents: { dispatch },
      PostsBulkAddTagsEvent,
      PostRevisions,
    });
  }

  beforeEach(function () {
    dispatch = sinon.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('endpoint composition', function () {
    // Each case evaluates the root and both endpoints afresh so the readiness guard and the
    // endpoints' captured root are observed from an uninitialized state.
    const paths = [ROOT_PATH, USERS_ENDPOINT_PATH, AUTHENTICATION_ENDPOINT_PATH];
    let originalModules: Map<string, NodeJS.Module | undefined>;
    let root: Root;

    beforeEach(function () {
      originalModules = new Map(paths.map((path) => [path, require.cache[path]]));
      for (const path of paths) {
        delete require.cache[path];
      }
      root = require(ROOT_PATH).default;
    });

    afterEach(function () {
      for (const [path, original] of originalModules) {
        if (original) {
          require.cache[path] = original;
        } else {
          delete require.cache[path];
        }
      }
    });

    it('loads the users endpoint through the API registry before the service is ready', async function () {
      // The update check composes api.users.browse from this registry while it runs,
      // which can evaluate the users endpoint before any Admin request has.
      const endpoints = require('../../../../../core/server/api').endpoints;
      const destroyUser = sandbox.stub(Users.prototype, 'destroyUser').resolves();

      assert.throws(() => root.service, IncorrectUsageError);
      const controller = endpoints.users;
      const endpoint = require(USERS_ENDPOINT_PATH);
      await root.init();
      const first = { id: 'user-id', context: { user: 'actor' } };
      const second = { id: 'other-user-id', context: { user: 'actor' } };
      await endpoint.destroy.query({ options: first });
      await endpoint.destroy.query({ options: second });

      assert.equal(typeof controller.browse, 'function');
      sinon.assert.calledTwice(destroyUser);
      assert.equal(destroyUser.firstCall.args[0], first);
      assert.equal(destroyUser.secondCall.args[0], second);
      const instance = destroyUser.firstCall.thisValue;
      assert.ok(instance instanceof Users);
      assert.equal(instance.models, models);
      assert.equal(destroyUser.secondCall.thisValue, instance);
      assert.equal(instance, root.service, 'the boot-owned instance handles every call');
    });

    it('passes the boot-owned instance to resetAuthentication on every reset', async function () {
      await root.init();
      const resetAuthentication = sandbox.stub().resolves({ apiKeysRotated: 1, usersLocked: 2 });
      sandbox.stub(auth, 'resetAuthentication').get(() => resetAuthentication);
      const endpoint = require(AUTHENTICATION_ENDPOINT_PATH);
      const options = { context: { user: 'actor' } };

      const result = await endpoint.reset.query({ options, original: {} });
      await endpoint.reset.query({ options, original: {} });

      assert.deepEqual(result, { apiKeysRotated: 1, usersLocked: 2 });
      sinon.assert.calledTwice(resetAuthentication);
      const { userService, schedulerAdapter } = resetAuthentication.firstCall.args[0];
      assert.equal(resetAuthentication.firstCall.args[0].options, options);
      assert.equal(typeof schedulerAdapter.rescheduleAll, 'function');
      assert.ok(userService instanceof Users);
      assert.equal(userService.models, models);
      assert.equal(userService.lockAll, Users.prototype.lockAll);
      assert.equal(resetAuthentication.secondCall.args[0].userService, userService);
      assert.equal(userService, root.service);
    });

    it('shares the boot-owned instance between both endpoints', async function () {
      await root.init();
      const destroyUser = sandbox.stub(Users.prototype, 'destroyUser').resolves();
      const resetAuthentication = sandbox.stub().resolves({ apiKeysRotated: 0, usersLocked: 0 });
      sandbox.stub(auth, 'resetAuthentication').get(() => resetAuthentication);

      await require(USERS_ENDPOINT_PATH).destroy.query({ options: { id: 'user-id' } });
      await require(AUTHENTICATION_ENDPOINT_PATH).reset.query({ options: {}, original: {} });

      assert.equal(
        destroyUser.firstCall.thisValue,
        resetAuthentication.firstCall.args[0].userService,
      );
    });
  });

  describe('lockAll', function () {
    function createUser() {
      return { lock: sinon.stub().resolves() };
    }

    it('opens a transaction and passes a copy of the options carrying it to every lock', async function () {
      const { models: fakes, transaction } = createModels();
      const user = createUser();
      fakes.User.findAll.resolves({ models: [user] });
      const service = createService(fakes);
      const frameOptions = { context: { user: 'actor' } };

      const result = await service.lockAll(frameOptions);

      assert.deepEqual(result, { count: 1 });
      sinon.assert.calledOnce(fakes.Base.transaction);
      const expected = { context: { user: 'actor' }, transacting: transaction };
      sinon.assert.calledOnceWithExactly(fakes.User.findAll, expected);
      sinon.assert.calledOnceWithExactly(user.lock, expected);
      assert.notEqual(fakes.User.findAll.firstCall.args[0], frameOptions);
      assert.deepEqual(frameOptions, { context: { user: 'actor' } }, 'caller options unchanged');
    });

    it('passes the caller options through unchanged when they carry a transaction', async function () {
      const { models: fakes } = createModels();
      const user = createUser();
      fakes.User.findAll.resolves({ models: [user] });
      const service = createService(fakes);
      const frameOptions = { context: { user: 'actor' }, transacting: { label: 'outer' } };

      await service.lockAll(frameOptions);

      sinon.assert.notCalled(fakes.Base.transaction);
      assert.equal(fakes.User.findAll.firstCall.args[0], frameOptions);
      assert.equal(user.lock.firstCall.args[0], frameOptions);
    });
  });

  describe('assignTagToUserPosts', function () {
    const transacting = { label: 'caller transaction' };
    const context = { user: 'actor' };

    it('is bound so it runs detached from the instance', async function () {
      const { models: fakes } = createModels();
      const { assignTagToUserPosts } = createService(fakes);

      await assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.calledOnce(fakes.User.findOne);
      sinon.assert.calledOnce(fakes.Post.addActions);
    });

    it('reads the author and their posts inside the caller transaction', async function () {
      const { models: fakes, calls } = createModels();
      const service = createService(fakes);

      await service.assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.calledOnceWithExactly(
        fakes.User.findOne,
        { id: 'user-id' },
        { id: 'user-id', context, transacting },
      );
      const postsQuery = calls.filter((call) => call.table === 'posts_authors');
      assert.deepEqual(postsQuery.map((call) => [call.method, ...call.args]).slice(0, 3), [
        ['transacting', transacting],
        ['where', 'author_id', 'user-id'],
        ['select', 'post_id'],
      ]);
    });

    it('throws NotFoundError before any post work when the user is missing', async function () {
      const { models: fakes, calls } = createModels();
      fakes.User.findOne.resolves(null);
      const service = createService(fakes);

      await assert.rejects(
        service.assignTagToUserPosts({ id: 'user-id', context, transacting }),
        UserNotFoundError,
      );

      assert.deepEqual(calls, []);
      sinon.assert.notCalled(fakes.Tag.findOne);
      sinon.assert.notCalled(dispatch);
    });

    it('returns before any tag work when the author has no posts', async function () {
      const { models: fakes, calls, inserted } = createModels({ userPostIds: [] });
      const service = createService(fakes);

      await service.assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.notCalled(fakes.Tag.findOne);
      sinon.assert.notCalled(fakes.Tag.add);
      assert.deepEqual(
        calls.filter((call) => call.table === 'posts_tags'),
        [],
      );
      assert.deepEqual(inserted, []);
      sinon.assert.notCalled(fakes.Post.addActions);
      sinon.assert.notCalled(dispatch);
    });

    it('creates the hash tag in the caller transaction and tags every post when it is missing', async function () {
      const { models: fakes, calls, inserted } = createModels({ existingTag: false });
      const service = createService(fakes);

      await service.assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.calledOnceWithExactly(
        fakes.Tag.findOne,
        { slug: 'hash-author-slug' },
        { context, transacting },
      );
      sinon.assert.calledOnceWithExactly(
        fakes.Tag.add,
        { slug: '#author-slug' },
        { context, transacting },
      );
      const tagQueries = calls.filter((call) => call.table === 'posts_tags');
      assert.deepEqual(
        tagQueries.map((call) => call.method),
        ['transacting', 'insert'],
        'a freshly created tag skips the already-tagged lookup',
      );
      assert.equal(tagQueries[0].args[0], transacting);
      assert.deepEqual(
        inserted.map(({ id, ...row }) => {
          assert.match(String(id), /^[0-9a-f]{24}$/);
          return row;
        }),
        [
          { post_id: 'post-1', tag_id: 'tag-id', sort_order: 0 },
          { post_id: 'post-2', tag_id: 'tag-id', sort_order: 0 },
        ],
      );
      sinon.assert.calledOnceWithExactly(fakes.Post.addActions, 'edited', ['post-1', 'post-2'], {
        transacting,
        context,
      });
    });

    it('looks up already tagged posts inside the caller transaction when the tag exists', async function () {
      const { models: fakes, calls, inserted } = createModels({ taggedPostIds: ['post-1'] });
      const service = createService(fakes);

      await service.assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.notCalled(fakes.Tag.add);
      const tagQueries = calls.filter((call) => call.table === 'posts_tags');
      assert.deepEqual(
        tagQueries.slice(0, 2).map((call) => [call.method, ...call.args]),
        [
          ['transacting', transacting],
          ['where', 'tag_id', 'tag-id'],
        ],
      );
      assert.deepEqual(
        inserted.map((row) => row.post_id),
        ['post-2'],
      );
    });

    it('dispatches one PostsBulkAddTagsEvent carrying the newly tagged post ids', async function () {
      const { models: fakes } = createModels({ taggedPostIds: ['post-1'] });
      const service = createService(fakes);

      await service.assignTagToUserPosts({ id: 'user-id', context, transacting });

      sinon.assert.calledOnce(dispatch);
      const [event] = dispatch.firstCall.args;
      assert.ok(event instanceof PostsBulkAddTagsEvent);
      assert.deepEqual(event.data, ['post-2']);
      assert.ok(event.timestamp instanceof Date);
    });
  });

  describe('destroyUser', function () {
    const context = { user: 'actor' };

    it('opens its own transaction and overwrites the caller transaction in every stage', async function () {
      const { models: fakes, transaction } = createModels();
      const service = createService(fakes);
      const frameOptions = { id: 'user-id', context, transacting: { label: 'outer' } };

      await service.destroyUser(frameOptions);

      sinon.assert.calledOnce(fakes.Base.transaction);
      assert.equal(
        frameOptions.transacting,
        transaction,
        'caller options now carry the new transaction',
      );
      sinon.assert.calledOnceWithExactly(fakes.PostRevision.findAll, {
        filter: "author_id:'user-id'",
        columns: ['id'],
        transacting: transaction,
      });
      sinon.assert.calledOnceWithExactly(
        fakes.User.findOne,
        { id: 'user-id' },
        { id: 'user-id', context, transacting: transaction },
      );
      sinon.assert.calledOnceWithExactly(fakes.Post.reassignByAuthor, {
        id: 'user-id',
        context,
        transacting: transaction,
      });
      sinon.assert.calledOnceWithExactly(fakes.ApiKey.destroy, {
        id: 'user-id',
        context,
        transacting: transaction,
        require: true,
        destroyBy: { user_id: 'user-id' },
      });
      sinon.assert.calledOnceWithExactly(fakes.User.destroy, {
        status: 'all',
        id: 'user-id',
        context,
        transacting: transaction,
      });
    });

    it('runs revision cleanup, tagging, reassignment, key removal and deletion in order inside the transaction', async function () {
      const { models: fakes, state } = createModels();
      const service = createService(fakes);

      await service.destroyUser({ id: 'user-id', context });

      sinon.assert.callOrder(
        fakes.PostRevision.findAll,
        fakes.User.findOne,
        fakes.Post.addActions,
        fakes.Post.reassignByAuthor,
        fakes.ApiKey.destroy,
        fakes.User.destroy,
      );
      assert.equal(state.settled, true);
    });

    it('constructs a revisions helper around the PostRevision model on every call', async function () {
      const { models: fakes, transaction } = createModels();
      const removeAuthor = sandbox.spy(PostRevisions.prototype, 'removeAuthorFromRevisions');
      const service = createService(fakes);

      await service.destroyUser({ id: 'user-id', context });
      await service.destroyUser({ id: 'other-user-id', context });

      sinon.assert.calledTwice(removeAuthor);
      assert.deepEqual(removeAuthor.firstCall.args, ['user-id', { transacting: transaction }]);
      assert.deepEqual(removeAuthor.secondCall.args, [
        'other-user-id',
        { transacting: transaction },
      ]);
      assert.equal(removeAuthor.firstCall.thisValue.model, fakes.PostRevision);
      assert.equal(removeAuthor.secondCall.thisValue.model, fakes.PostRevision);
      assert.notEqual(removeAuthor.firstCall.thisValue, removeAuthor.secondCall.thisValue);
    });

    it('dispatches the tag event before the transaction settles', async function () {
      const { models: fakes, state } = createModels();
      let dispatchedWhileOpen: boolean | undefined;
      dispatch.callsFake(() => {
        dispatchedWhileOpen = state.open;
      });
      const service = createService(fakes);

      await service.destroyUser({ id: 'user-id', context });

      sinon.assert.calledOnce(dispatch);
      assert.equal(dispatchedWhileOpen, true);
    });

    it('leaves the tag event dispatched when a later stage fails', async function () {
      const { models: fakes } = createModels();
      const failure = new Error('reassignment failed');
      fakes.Post.reassignByAuthor.rejects(failure);
      const service = createService(fakes);

      await assert.rejects(service.destroyUser({ id: 'user-id', context }), failure);

      sinon.assert.calledOnce(dispatch);
      sinon.assert.notCalled(fakes.ApiKey.destroy);
      sinon.assert.notCalled(fakes.User.destroy);
    });

    it('ignores a missing staff API key and still deletes the user', async function () {
      const { models: fakes } = createModels();
      fakes.ApiKey.destroy.rejects(new fakes.ApiKey.NotFoundError('no key'));
      const service = createService(fakes);

      await service.destroyUser({ id: 'user-id', context });

      sinon.assert.calledOnce(fakes.User.destroy);
    });

    it('rethrows any other API key failure before deleting the user', async function () {
      const { models: fakes } = createModels();
      const failure = new Error('key removal failed');
      fakes.ApiKey.destroy.rejects(failure);
      const service = createService(fakes);

      await assert.rejects(service.destroyUser({ id: 'user-id', context }), failure);

      sinon.assert.notCalled(fakes.User.destroy);
    });
  });
});
