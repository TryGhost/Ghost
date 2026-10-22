const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const events = require('../../../core/server/lib/common/events');
const knex = require('../../../core/server/data/db').knex;
const PostsService = require('../../../core/server/services/posts/posts-service');

const owner = testUtils.context.owner.context.user;
const editor = testUtils.context.editor.context.user;
const admin = testUtils.context.admin.context.user;
const withRelated = ['authors', 'authors.roles', 'tags', 'post_revisions', 'post_revisions.author'];
const lexical = testUtils.DataGenerator.markdownToLexical;
const service = new PostsService({ models });

function edit(post, data, options = {}) {
  return service.editPost({
    data: { posts: [data] },
    options: { ...testUtils.context.owner, id: post.id, withRelated, ...options },
  });
}

async function addPost(authors, tags, revisionAuthor = owner) {
  return models.Post.add(
    {
      title: 'Concurrent post',
      lexical: lexical('Original content'),
      authors: authors.map((id) => ({ id })),
      tags: tags.map((tag) => ({ id: tag.id })),
    },
    { context: { user: revisionAuthor }, withRelated },
  );
}

async function assertRelations(post, authors, tags) {
  const saved = await models.Post.findOne({ id: post.id, status: 'all' }, { withRelated });
  assert.deepEqual(saved.related('authors').pluck('id'), authors);
  assert.deepEqual(
    saved.related('tags').pluck('id'),
    tags.map((tag) => tag.id),
  );
  return saved;
}

// Arrange the reachable author-before-tag schedule: both transactions finish
// their author reads before either starts its other eager relations. MySQL still
// executes every query and decides which transaction wins the shared tag.
async function overlapAuthorReads(posts, callback) {
  const ready = Promise.withResolvers();
  let remaining = posts.length;
  const timeout = setTimeout(() => ready.reject(new Error('Author reads did not overlap')), 5000);
  ready.promise.catch(() => {});
  try {
    return await Promise.allSettled(
      posts.map((post) =>
        models.Post.editTransaction(async (transacting) => {
          const query = transacting.client.query.bind(transacting.client);
          let held = false;
          sinon.stub(transacting.client, 'query').callsFake(async (connection, statement) => {
            if (
              statement.sql?.startsWith('select distinct') &&
              !statement.sql.includes('inner join `posts_authors`')
            ) {
              await ready.promise;
            }
            const response = await query(connection, statement);
            if (!held && statement.sql?.includes('inner join `posts_authors`')) {
              held = true;
              remaining -= 1;
              if (remaining === 0) {
                ready.resolve();
              }
            }
            return response;
          });
          try {
            return await callback(post, transacting);
          } catch (err) {
            ready.reject(err);
            throw err;
          }
        }),
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
}

function assertSucceeded(results) {
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }
}

describe('Concurrent post edits', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));
  afterAll(testUtils.teardownDb);

  beforeEach(function () {
    sinon.stub(events, 'emit');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('edits different posts with a shared tag and opposite revision authors', async function () {
    const tag = await models.Tag.add({ name: 'Shared concurrency tag' }, testUtils.context.owner);
    const posts = [await addPost([editor], [tag], owner), await addPost([owner], [tag], editor)];
    const results = await overlapAuthorReads(posts, (post, transacting) =>
      edit(
        post,
        {
          title: `Edited ${post.id}`,
          lexical: lexical(`Edited content ${post.id}`),
        },
        { transacting, save_revision: true },
      ),
    );
    assertSucceeded(results);

    for (const [index, post] of posts.entries()) {
      const saved = await assertRelations(post, [index === 0 ? editor : owner], [tag]);
      assert.equal(saved.get('title'), `Edited ${post.id}`);
      assert(
        saved
          .related('post_revisions')
          .some((revision) => revision.get('title') === saved.get('title')),
      );
      for (const revision of saved.related('post_revisions').models) {
        assert(revision.related('author').id);
      }
    }
  });

  it('replaces and reorders shared authors and tags on different posts', async function () {
    const tags = [];
    for (const name of ['First shared tag', 'Second shared tag', 'Replacement tag']) {
      tags.push(await models.Tag.add({ name }, testUtils.context.owner));
    }
    const posts = [
      await addPost([owner, editor], tags.slice(0, 2)),
      await addPost([owner, editor], tags.slice(0, 2)),
    ];
    const authors = [
      [editor, admin],
      [admin, owner],
    ];
    const orders = [
      [tags[1], tags[2], tags[0]],
      [tags[2], tags[0]],
    ];
    const results = await Promise.allSettled(
      posts.map((post, index) =>
        edit(
          post,
          {
            title: `Reordered ${index}`,
            authors: authors[index].map((id) => ({ id })),
            tags: orders[index].map((tag) => ({ id: tag.id })),
          },
          { save_revision: true },
        ),
      ),
    );
    assertSucceeded(results);
    for (const [index, post] of posts.entries()) {
      await assertRelations(post, authors[index], orders[index]);
    }
  });

  it('inserts a tag while another post waits for the shared tag', async function () {
    const tag = await models.Tag.add({ name: 'Gap shared tag' }, testUtils.context.owner);
    const added = await models.Tag.add({ name: 'Gap inserted tag' }, testUtils.context.owner);
    const first = await addPost([owner], [tag], owner);
    const second = await addPost([editor], [tag], editor);
    const fetched = Promise.withResolvers();
    const release = Promise.withResolvers();
    const waiting = Promise.withResolvers();
    const onSaving = models.Post.prototype.onSaving;
    sinon.stub(models.Post.prototype, 'onSaving').callsFake(async function (...args) {
      if (this.id === first.id) {
        fetched.resolve();
        await release.promise;
      }
      return onSaving.apply(this, args);
    });

    const firstEdit = edit(first, { tags: [{ id: tag.id }, { id: added.id }] });
    firstEdit.catch((err) => fetched.reject(err));
    let secondEdit;
    try {
      await fetched.promise;
      secondEdit = models.Post.editTransaction(async (transacting) => {
        const [[{ connectionId }]] = await transacting.raw(
          'SELECT CONNECTION_ID() AS connectionId',
        );
        transacting.on('query', (query) => {
          if (query.sql.startsWith('select distinct `tags`')) {
            waiting.resolve(connectionId);
          }
        });
        return edit(second, { featured: true }, { transacting, context: { user: editor } });
      });
      secondEdit.catch((err) => waiting.reject(err));
      const connectionId = await waiting.promise;

      // Observe the real MySQL wait before allowing the insert. A query event
      // alone only proves submission, not that the pivot scan acquired locks.
      let isWaiting = false;
      const deadline = Date.now() + 5000;
      while (!isWaiting && Date.now() < deadline) {
        const [rows] = await knex.raw(
          `SELECT waits.REQUESTING_THREAD_ID
           FROM performance_schema.data_lock_waits AS waits
           INNER JOIN performance_schema.threads AS threads
             ON threads.THREAD_ID = waits.REQUESTING_THREAD_ID
           WHERE threads.PROCESSLIST_ID = ?`,
          [connectionId],
        );
        isWaiting = rows.length > 0;
        if (!isWaiting) {
          await new Promise((resolve) => {
            setImmediate(resolve);
          });
        }
      }
      assert(isWaiting, 'The second edit must be waiting for the shared tag');
    } finally {
      release.resolve();
      const results = await Promise.allSettled([firstEdit, secondEdit]);
      assertSucceeded(results);
    }
    await assertRelations(first, [owner], [tag, added]);
    await assertRelations(second, [editor], [tag]);
  });

  it('rejects a stale concurrent edit of the same post and rolls back its relations', async function () {
    const tags = [];
    for (const name of ['Original collision tag', 'First collision tag', 'Second collision tag']) {
      tags.push(await models.Tag.add({ name }, testUtils.context.owner));
    }
    const post = await addPost([owner], [tags[0]]);
    const updatedAt = new Date('2020-01-01T00:00:00Z');
    await knex('posts').where({ id: post.id }).update({ updated_at: updatedAt });
    events.emit.resetHistory();
    const results = await Promise.allSettled(
      [editor, admin].map((author, index) =>
        edit(
          post,
          {
            updated_at: updatedAt,
            title: `Winner ${index}`,
            authors: [{ id: author }],
            tags: [{ id: tags[index + 1].id }],
          },
          { save_revision: true },
        ),
      ),
    );
    const winner = results.findIndex((result) => result.status === 'fulfilled');
    assert.notEqual(winner, -1);
    const loser = results[1 - winner];
    assert.equal(loser.status, 'rejected');
    assert.equal(loser.reason.code, 'UPDATE_COLLISION');
    const saved = await assertRelations(post, [[editor], [admin]][winner], [tags[winner + 1]]);
    assert.equal(saved.get('title'), `Winner ${winner}`);
    assert(
      !saved
        .related('post_revisions')
        .some((revision) => revision.get('title') === `Winner ${1 - winner}`),
    );
    assert.equal(events.emit.getCalls().filter((call) => call.args[0] === 'post.edited').length, 1);
  });

  it('uses current relations when a caller transaction already has an older snapshot', async function () {
    const tags = [];
    for (const name of ['Snapshot tag one', 'Snapshot tag two', 'Snapshot tag three']) {
      tags.push(await models.Tag.add({ name }, testUtils.context.owner));
    }
    const post = await addPost([owner, editor], tags.slice(0, 2));
    await models.Base.transaction(async (transacting) => {
      await transacting('posts_authors').where({ post_id: post.id }).select();
      await transacting('posts_tags').where({ post_id: post.id }).select();
      await edit(post, {
        authors: [{ id: editor }, { id: admin }],
        tags: [{ id: tags[1].id }, { id: tags[2].id }],
      });
      events.emit.resetHistory();
      await edit(
        post,
        {
          title: 'Edited from older snapshot',
          authors: [{ id: admin }, { id: owner }],
          tags: [{ id: tags[2].id }, { id: tags[0].id }],
        },
        { transacting },
      );
      assert.equal(
        events.emit.getCalls().filter((call) => call.args[0] === 'post.edited').length,
        0,
      );
    });
    await assertRelations(post, [admin, owner], [tags[2], tags[0]]);
    const emitted = events.emit.getCalls().filter((call) => call.args[0] === 'post.edited');
    assert.equal(emitted.length, 1);
    assert.deepEqual(emitted[0].args[1].related('authors').pluck('id'), [admin, owner]);
  });

  it('rolls back post, relation and revision changes without emitting events', async function () {
    const tag = await models.Tag.add({ name: 'Rollback tag' }, testUtils.context.owner);
    const post = await addPost([owner], [tag]);
    const revisionIds = post.related('post_revisions').pluck('id');
    events.emit.resetHistory();
    const rollback = new Error('Roll back the caller transaction');
    await assert.rejects(
      models.Post.editTransaction(async (transacting) => {
        await edit(
          post,
          {
            title: 'Rolled back title',
            lexical: lexical('Rolled back content'),
            authors: [{ id: editor }],
            tags: [],
          },
          { transacting, save_revision: true },
        );
        sinon.assert.notCalled(events.emit);
        throw rollback;
      }),
      (err) => err === rollback,
    );
    const saved = await assertRelations(post, [owner], [tag]);
    assert.equal(saved.get('title'), post.get('title'));
    assert.deepEqual(saved.related('post_revisions').pluck('id'), revisionIds);
    sinon.assert.notCalled(events.emit);
  });
});
