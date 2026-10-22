import assert from 'node:assert/strict';
import sinon from 'sinon';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');

const { owner, admin } = testUtils.context;
const ownerId = testUtils.DataGenerator.Content.users[0].id;
const adminId = testUtils.DataGenerator.Content.users[1].id;

const lexical = (text: string) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [
            { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });

describe('Post Model: edit row locking', function () {
  let sharedTag: any;

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));
  afterAll(testUtils.teardownDb);
  afterEach(function () {
    sinon.restore();
  });

  beforeAll(async function () {
    sharedTag = await models.Tag.add({ name: 'Shared tag' }, owner);
  });

  // Post authored by one user with its revision authored by the other, so
  // locking eager-loaded `authors` then `post_revisions.author` takes the two
  // user rows in opposite orders across posts
  async function addCrossedPost(title: string, authorId: string, context: object) {
    return models.Post.add(
      {
        title,
        status: 'draft',
        lexical: lexical(title),
        authors: [{ id: authorId }],
        tags: [{ id: sharedTag.id }],
      },
      context,
    );
  }

  it('only locks the post row when editing', async function () {
    const post = await addCrossedPost('Captured', ownerId, admin);
    const sqls: string[] = [];
    const onQuery = (data: { sql: string }) => sqls.push(data.sql);

    db.knex.on('query', onQuery);
    try {
      await models.Post.edit({ title: 'Captured edit' }, { ...owner, id: post.id });
    } finally {
      db.knex.removeListener('query', onQuery);
    }

    const locked = sqls.filter((sql) => /for update/i.test(sql));
    assert.equal(locked.length, 1, `expected one locking query, got:\n${locked.join('\n')}`);
    assert.match(locked[0], /from `posts`/);
  });

  it('does not block editing a post that shares a tag and author with an in-flight edit', async function () {
    const held = await addCrossedPost('Held', ownerId, admin);
    const other = await addCrossedPost('Other', ownerId, admin);

    let release!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    let acquired!: () => void;
    const acquiredPromise = new Promise<void>((resolve) => {
      acquired = resolve;
    });

    const holder = db.knex.transaction(async (transacting: unknown) => {
      await models.Post.edit({ title: 'Held edit' }, { ...owner, id: held.id, transacting });
      acquired();
      await releasePromise;
    });

    await acquiredPromise;

    try {
      const result = await Promise.race([
        models.Post.edit({ title: 'Concurrent edit' }, { ...owner, id: other.id }).then(
          () => 'done',
        ),
        new Promise((resolve) => {
          setTimeout(() => resolve('blocked'), 3000);
        }),
      ]);
      assert.equal(result, 'done');
    } finally {
      release();
      await holder;
    }
  });

  it('does not deadlock on concurrent edits of posts with crossed authors', async function () {
    const posts = [];
    for (let i = 0; i < 10; i++) {
      posts.push(await addCrossedPost(`Owner post ${i}`, ownerId, admin));
      posts.push(await addCrossedPost(`Admin post ${i}`, adminId, owner));
    }

    const errors: string[] = [];
    for (let round = 0; round < 5; round++) {
      const results = await Promise.allSettled(
        posts.map((post, i) =>
          models.Post.edit(
            { title: `Round ${round} post ${i}`, tags: [{ id: sharedTag.id }] },
            { ...owner, id: post.id },
          ),
        ),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          errors.push(result.reason.code || result.reason.message);
        }
      }
    }

    assert.deepEqual(errors, []);
  });

  // Relations are no longer locked, so a tag can be deleted after an edit has
  // read the post's tags but before it writes them
  describe('tag deleted during an edit', function () {
    async function editWhileDeletingTag(keepTag: boolean) {
      const tag = await models.Tag.add({ name: `Doomed ${keepTag}` }, owner);
      const post = await models.Post.add(
        { title: 'Race', status: 'draft', tags: [{ id: tag.id }, { id: sharedTag.id }] },
        owner,
      );

      let destroyed: Promise<unknown> | undefined;
      let destroyedMidEdit = false;
      const onSaving = models.Post.prototype.onSaving;
      sinon.stub(models.Post.prototype, 'onSaving').callsFake(async function (
        this: any,
        ...args: unknown[]
      ) {
        if (!destroyed) {
          const destroy: Promise<unknown> = models.Tag.destroy({ ...owner, id: tag.id });
          destroyed = destroy;
          // Wait for the delete unless it is blocked behind the edit's locks
          await Promise.race([
            destroy.then(() => {
              destroyedMidEdit = true;
            }),
            new Promise((resolve) => {
              setTimeout(resolve, 1000);
            }),
          ]);
        }
        return onSaving.apply(this, args);
      });

      const tags = keepTag ? [{ id: tag.id }, { id: sharedTag.id }] : [{ id: sharedTag.id }];
      const edit = await models.Post.edit(
        { title: 'Race edit', tags },
        { ...owner, id: post.id },
      ).then(
        () => 'ok',
        (err: any) => err.code || err.message,
      );
      await destroyed;

      const tagRows = await db.knex('tags').where('id', tag.id);
      const links = await db.knex('posts_tags').where('post_id', post.id).pluck('tag_id');
      return { edit, destroyedMidEdit, tagRows, links };
    }

    it('drops the deleted tag when the edit keeps it', async function () {
      const result = await editWhileDeletingTag(true);

      assert.equal(result.destroyedMidEdit, true);
      assert.equal(result.edit, 'ok');
      assert.equal(result.tagRows.length, 0);
      assert.deepEqual(result.links, [sharedTag.id]);
    });

    it('drops the deleted tag when the edit removes it', async function () {
      const result = await editWhileDeletingTag(false);

      assert.equal(result.destroyedMidEdit, true);
      assert.equal(result.edit, 'ok');
      assert.equal(result.tagRows.length, 0);
      assert.deepEqual(result.links, [sharedTag.id]);
    });
  });
});
