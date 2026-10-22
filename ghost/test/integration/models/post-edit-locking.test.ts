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

  it('only locks the post rows when fetching a collection for update', async function () {
    await addCrossedPost('Collection', ownerId, admin);
    const sqls: string[] = [];
    const onQuery = (data: { sql: string }) => sqls.push(data.sql);

    db.knex.on('query', onQuery);
    try {
      await db.knex.transaction((transacting: unknown) =>
        models.Post.findAll({
          ...owner,
          filter: 'status:draft',
          withRelated: ['tags', 'authors', 'posts_meta'],
          transacting,
          forUpdate: true,
        }),
      );
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

    const edit = models.Post.edit({ title: 'Concurrent edit' }, { ...owner, id: other.id });
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        edit.then(() => 'done'),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve('blocked'), 3000);
        }),
      ]);
      assert.equal(result, 'done');
    } finally {
      clearTimeout(timer);
      release();
      await holder;
      await edit;
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

  // Writers that change a post's relations without editing it lock the post
  // first, so they wait for an in-flight edit rather than changing relations the
  // edit has already read
  async function writeDuringEdit(postId: string, data: object, write: () => Promise<unknown>) {
    let written: Promise<unknown> | undefined;
    let writtenDuringEdit = false;
    const onSaving = models.Post.prototype.onSaving;
    sinon.stub(models.Post.prototype, 'onSaving').callsFake(async function (
      this: any,
      ...args: unknown[]
    ) {
      if (!written) {
        written = write();
        writtenDuringEdit = await Promise.race([
          written.then(() => true),
          new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 1000);
          }),
        ]);
      }
      return onSaving.apply(this, args);
    });

    const edit = await models.Post.edit(
      { title: 'Race edit', ...data },
      { ...owner, id: postId },
    ).then(
      () => 'ok',
      (err: any) => err.code || err.message,
    );
    await written;

    return { edit, writtenDuringEdit };
  }

  describe('tag deleted during an edit', function () {
    async function editWhileDeletingTag(keepTag: boolean) {
      const tag = await models.Tag.add({ name: `Doomed ${keepTag}` }, owner);
      const post = await models.Post.add(
        { title: 'Race', status: 'draft', tags: [{ id: tag.id }, { id: sharedTag.id }] },
        owner,
      );

      const tags = keepTag ? [{ id: tag.id }, { id: sharedTag.id }] : [{ id: sharedTag.id }];
      const result = await writeDuringEdit(post.id, { tags }, () =>
        models.Tag.destroy({ ...owner, id: tag.id }),
      );

      const tagRows = await db.knex('tags').where('id', tag.id);
      const links = await db.knex('posts_tags').where('post_id', post.id).pluck('tag_id');
      return { ...result, tagRows, links };
    }

    it('waits for the edit and drops the tag when the edit keeps it', async function () {
      const result = await editWhileDeletingTag(true);

      assert.equal(result.writtenDuringEdit, false);
      assert.equal(result.edit, 'ok');
      assert.equal(result.tagRows.length, 0);
      assert.deepEqual(result.links, [sharedTag.id]);
    });

    it('waits for the edit and drops the tag when the edit removes it', async function () {
      const result = await editWhileDeletingTag(false);

      assert.equal(result.writtenDuringEdit, false);
      assert.equal(result.edit, 'ok');
      assert.equal(result.tagRows.length, 0);
      assert.deepEqual(result.links, [sharedTag.id]);
    });
  });

  // Runs last: it moves every post of the admin user to the owner
  describe('author reassigned during an edit', function () {
    it('waits for the edit so the post keeps an author', async function () {
      const post = await models.Post.add(
        { title: 'Race', status: 'draft', authors: [{ id: adminId }, { id: ownerId }] },
        owner,
      );

      const result = await writeDuringEdit(post.id, { authors: [{ id: adminId }] }, () =>
        db.knex.transaction((transacting: unknown) =>
          models.Post.reassignByAuthor({ ...owner, id: adminId, transacting }),
        ),
      );

      const links = await db.knex('posts_authors').where('post_id', post.id).pluck('author_id');
      assert.equal(result.writtenDuringEdit, false);
      assert.equal(result.edit, 'ok');
      assert.deepEqual(links, [ownerId]);
    });
  });
});
