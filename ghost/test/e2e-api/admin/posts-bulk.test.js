const DomainEvents = require('@tryghost/domain-events');
const { mobiledocToLexical } = require('@tryghost/kg-converters');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('node:assert/strict');

describe('Posts Bulk API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();

    // Note that we generate lots of fixtures here to test the bulk deletion correctly
    await fixtureManager.init(
      'posts',
      'newsletters',
      'members:newsletters',
      'emails',
      'redirects',
      'clicks',
      'comments',
      'feedback',
      'links',
      'mentions',
    );
    await agent.loginAsOwner();

    // convert inserted pages to lexical so we can test page.html reset/re-render
    const pages = await models.Post.where('type', 'page').fetchAll();
    for (const page of pages) {
      const lexical = mobiledocToLexical(page.get('mobiledoc'));
      await models.Base.knex.raw('UPDATE posts SET mobiledoc=NULL, lexical=? where id=?', [
        lexical,
        page.id,
      ]);
    }
  });

  afterEach(async function () {
    // give pages some HTML back to alleviate test interdependence when pages are reset on create/update/delete
    await models.Base.knex.raw(
      "UPDATE posts SET html = '<p>Testing</p>' WHERE type = 'page' AND html IS NULL",
    );

    mockManager.restore();
  });

  describe('Edit', function () {
    it('Rejects restricted filter fields without broadening the operation', async function () {
      const featuredBefore = await models.Post.findAll({ filter: 'featured:true', status: 'all' });

      await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent('authors.password:abcd'))
        .body({
          bulk: {
            action: 'feature',
          },
        })
        .expectStatus(400);

      const featuredAfter = await models.Post.findAll({ filter: 'featured:true', status: 'all' });
      assert.deepEqual(featuredAfter.pluck('id'), featuredBefore.pluck('id'));
    });

    it('Can feature multiple posts', async function () {
      const filter = 'status:[published,draft,scheduled,sent]';

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'feature',
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      await DomainEvents.allSettled();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed`,
      );

      // Fetch all posts and check if they are featured
      const posts = await models.Post.findAll({ filter, status: 'all' });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        assert(post.get('featured') === true, `Expect post ${post.id} to be featured`);
      }
    });

    it('Can unfeature multiple posts', async function () {
      const filter = 'status:[published,draft,scheduled,sent]';

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'unfeature',
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      await DomainEvents.allSettled();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed`,
      );

      // Fetch all posts and check if they are featured
      const posts = await models.Post.findAll({ filter, status: 'all' });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        assert(post.get('featured') === false, `Expect post ${post.id} to be unfeatured`);
      }
    });

    it('Can change access of posts', async function () {
      const filter = 'status:[published,draft,scheduled,sent]';

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'access',
            meta: {
              visibility: 'paid',
            },
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed`,
      );

      // Fetch all posts and check if they have the correct access
      const posts = await models.Post.findAll({ filter, status: 'all' });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        assert(post.get('visibility') === 'paid', `Expect post ${post.id} to have access 'paid'`);
      }
    });

    it('Can change access of posts to tiers', async function () {
      const filter = 'status:[published,draft,scheduled,sent]';

      const products = await models.Product.findAll();

      const tier1 = products.models[0];
      const tier2 = products.models[1];

      assert(tier1.id && tier2.id);

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'access',
            meta: {
              visibility: 'tiers',
              tiers: [
                {
                  id: tier1.id,
                },
                {
                  id: tier2.id,
                },
              ],
            },
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed`,
      );

      // Fetch all posts and check if they have the correct access
      const posts = await models.Post.findAll({ filter, status: 'all', withRelated: ['tiers'] });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        assert(post.get('visibility') === 'tiers', `Expect post ${post.id} to have access 'tiers'`);
        assert.equal(post.related('tiers').length, 2);
      }
    });

    it('Can add a single tag to posts', async function () {
      const filter = 'status:[published]';
      const tag = await models.Tag.findOne({ slug: fixtureManager.get('tags', 0).slug });
      assert(tag);

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'addTag',
            meta: {
              tags: [
                {
                  id: tag.id,
                },
              ],
            },
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`,
      );

      // Fetch all posts and check if they have the tag
      const posts = await models.Post.findAll({ filter, status: 'all', withRelated: ['tags'] });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        const tags = post.related('tags');
        // Check tag is in the list
        assert(
          tags.find((t) => t.id === tag.id),
          `Expect post ${post.id} to have tag ${tag.id}`,
        );
      }
    });

    it('Does not add a tag to posts that already have it', async function () {
      const filter = 'status:[published]';
      const tag = await models.Tag.findOne({ slug: fixtureManager.get('tags', 0).slug });
      assert(tag);

      const addTag = async () => {
        await agent
          .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
          .body({ bulk: { action: 'addTag', meta: { tags: [{ id: tag.id }] } } })
          .expectStatus(200);
      };

      // Apply the tag, then apply the same tag again - which the bulk action in Admin allows
      await addTag();
      await addTag();

      const duplicates = await models.Base.knex('posts_tags')
        .where('tag_id', tag.id)
        .select('post_id')
        .count('* as rows')
        .groupBy('post_id')
        .having('rows', '>', 1);

      assert.equal(
        duplicates.length,
        0,
        `Expect no duplicate posts_tags rows, got ${JSON.stringify(duplicates)}`,
      );
    });

    it('Does not add the same tag twice when it is passed twice', async function () {
      const filter = 'status:[draft]';
      const tag = await models.Tag.findOne({ slug: fixtureManager.get('tags', 2).slug });
      assert(tag);

      await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({ bulk: { action: 'addTag', meta: { tags: [{ id: tag.id }, { id: tag.id }] } } })
        .expectStatus(200);

      const duplicates = await models.Base.knex('posts_tags')
        .where('tag_id', tag.id)
        .select('post_id')
        .count('* as rows')
        .groupBy('post_id')
        .having('rows', '>', 1);

      assert.equal(
        duplicates.length,
        0,
        `Expect no duplicate posts_tags rows, got ${JSON.stringify(duplicates)}`,
      );
    });

    it('Only creates one tag when the same new tag name is passed twice', async function () {
      const filter = 'status:[draft]';
      const name = 'Repeated new tag';

      await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({ bulk: { action: 'addTag', meta: { tags: [{ name }, { name }] } } })
        .expectStatus(200);

      const tags = await models.Tag.findAll({ filter: `name:'${name}'` });
      assert.equal(
        tags.length,
        1,
        `Expect a single tag to be created, got ${JSON.stringify(tags.models.map((t) => t.get('slug')))}`,
      );

      const duplicates = await models.Base.knex('posts_tags')
        .where('tag_id', tags.models[0].id)
        .select('post_id')
        .count('* as rows')
        .groupBy('post_id')
        .having('rows', '>', 1);

      assert.equal(
        duplicates.length,
        0,
        `Expect no duplicate posts_tags rows, got ${JSON.stringify(duplicates)}`,
      );
    });

    it('Reuses an existing tag when it is added by name', async function () {
      const filter = 'status:[draft]';
      const existing = await models.Tag.add(
        { name: 'Already here' },
        { context: { internal: true } },
      );

      const countTagsLike = async () => {
        const rows = await models.Base.knex('tags')
          .whereRaw('LOWER(name) = ?', ['already here'])
          .select('id');
        return rows.length;
      };

      // Same name, and the same name in a different case, both belong to
      // the tag that is already there
      for (const name of ['Already here', 'ALREADY HERE']) {
        await agent
          .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
          .body({ bulk: { action: 'addTag', meta: { tags: [{ name }] } } })
          .expectStatus(200);

        assert.equal(await countTagsLike(), 1, `Expect no new tag to be created for "${name}"`);
      }

      const posts = await models.Post.findAll({ filter, status: 'all', withRelated: ['tags'] });
      for (const post of posts) {
        assert(
          post.related('tags').find((t) => t.id === existing.id),
          `Expect post ${post.id} to have the existing tag`,
        );
      }
    });

    it('Reuses an existing tag when it is added by slug', async function () {
      const filter = 'status:[draft]';
      const existing = await models.Tag.add(
        { name: 'Slug owner', slug: 'slug-owner' },
        { context: { internal: true } },
      );

      // Tag.add honours a supplied slug, so the lookup has to use it too
      await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'addTag',
            meta: { tags: [{ name: 'A different name', slug: 'slug-owner' }] },
          },
        })
        .expectStatus(200);

      const owners = await models.Base.knex('tags')
        .where('slug', 'like', 'slug-owner%')
        .select('slug');
      assert.deepEqual(
        owners.map((t) => t.slug),
        ['slug-owner'],
        'Expect no second tag to be created',
      );

      const posts = await models.Post.findAll({ filter, status: 'all', withRelated: ['tags'] });
      for (const post of posts) {
        assert(
          post.related('tags').find((t) => t.id === existing.id),
          `Expect post ${post.id} to have the existing tag`,
        );
      }
    });

    it('Does not confuse a tag id with another tag of the same name', async function () {
      const filter = 'status:[draft]';
      const existing = await models.Tag.findOne({ slug: fixtureManager.get('tags', 1).slug });
      assert(existing);

      // A tag named after another tag's id - contrived, but the two are
      // deduplicated against each other if they share a key space
      await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: { action: 'addTag', meta: { tags: [{ id: existing.id }, { name: existing.id }] } },
        })
        .expectStatus(200);

      const named = await models.Tag.findAll({ filter: `name:'${existing.id}'` });
      assert.equal(named.length, 1, 'Expect the tag named after the id to still be created');
    });

    it('Rejects tags that are not usable objects', async function () {
      const validTag = await models.Tag.findOne({ slug: fixtureManager.get('tags', 0).slug });
      const invalidTags = [
        [null],
        ['a-tag-id'],
        [1],
        [true],
        [{ id: 1 }],
        [{ name: 1 }],
        [{ name: {} }],
        // Falsy non-strings are supplied values too, not absent ones
        [{ id: 0, name: 'Falsy id' }],
        [{ id: false, name: 'Falsy id' }],
        [{ name: 0, id: validTag.id }],
        [{ name: false, id: validTag.id }],
      ];

      for (const tags of invalidTags) {
        await agent
          .put('/posts/bulk/?filter=' + encodeURIComponent('status:[draft]'))
          .body({ bulk: { action: 'addTag', meta: { tags } } })
          .expectStatus(400);
      }
    });

    it('Can add multiple tags to posts and create new tags', async function () {
      const filter = 'status:[draft]';
      const tag = await models.Tag.findOne({ id: fixtureManager.get('tags', 1).id });
      assert(tag);

      const newTag = {
        name: 'Just a random new tag',
      };

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'addTag',
            meta: {
              tags: [
                {
                  id: tag.id,
                },
                {
                  name: newTag.name,
                },
              ],
            },
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be changed, got ${response.body.bulk.meta.stats.successful} instead`,
      );

      // Check if the new tag was created
      const newTags = await models.Tag.findAll({ filter: `name:'${newTag.name}'` });
      assert.equal(newTags.length, 1, `Expect tag to be created`);

      const newTagModel = newTags.models[0];

      // Fetch all posts and check if they have the tag
      const posts = await models.Post.findAll({ filter, status: 'all', withRelated: ['tags'] });
      assert.equal(posts.length, amount, `Expect all matching posts (${amount}) to be changed`);

      for (const post of posts) {
        const tags = post.related('tags');
        // Check tag is in the list
        assert(
          tags.find((t) => t.id === tag.id),
          `Expect post ${post.id} to have tag ${tag.id}`,
        );
        assert(
          tags.find((t) => t.id === newTagModel.id),
          `Expect post ${post.id} to have new tag ${newTagModel.id}`,
        );
      }
    });

    it('Can unpublish posts', async function () {
      const filter = 'status:[published]';
      const changedPosts = await models.Post.findPage({ filter, status: 'published' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .put('/posts/bulk/?filter=' + encodeURIComponent(filter))
        .body({
          bulk: {
            action: 'unpublish',
          },
        })
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be unpublished, got ${response.body.bulk.meta.stats.successful} instead`,
      );

      // Fetch all posts and check if they are unpublished
      const posts = await models.Post.findAll({ filter, status: 'all' });
      assert.equal(posts.length, 0, `Expect all matching posts (${amount}) to be unpublished`);

      // Re-publish the posts so we don't affect later tests
      const postIds = changedPosts.data.map((post) => post.id);
      await models.Base.knex.raw(
        `UPDATE posts SET status = \'published\' WHERE id IN (${postIds.map(() => '?').join(',')})`,
        [...postIds],
      );
    });
  });

  describe('Delete', function () {
    it('Can delete posts that match a tag', async function () {
      const tag = await models.Tag.findOne({ id: fixtureManager.get('tags', 0).id });
      const filter = 'tag:' + tag.get('slug');

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .delete('/posts/?filter=' + encodeURIComponent(filter))
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`,
      );

      // Check if all posts were deleted
      const posts = await models.Post.findPage({ filter, status: 'all' });
      assert.equal(
        posts.meta.pagination.total,
        0,
        `Expect all matching posts (${amount}) to be deleted`,
      );
    });

    it('Can delete a post with a threaded comment replying to another reply', async function () {
      const {
        body: {
          posts: [post],
        },
      } = await agent
        .post('/posts/')
        .body({ posts: [{ title: 'Post with a threaded comment', status: 'draft' }] })
        .expectStatus(201);

      const memberId = fixtureManager.get('members', 0).id;
      const root = await models.Comment.add({
        post_id: post.id,
        member_id: memberId,
        html: '<p>Root comment</p>',
        status: 'published',
      });
      const reply = await models.Comment.add({
        post_id: post.id,
        member_id: memberId,
        parent_id: root.id,
        html: '<p>Reply</p>',
        status: 'published',
      });
      await models.Comment.add({
        post_id: post.id,
        member_id: memberId,
        parent_id: root.id,
        in_reply_to_id: reply.id,
        html: '<p>Reply to the reply</p>',
        status: 'published',
      });

      // A long back-and-forth conversation, where each reply replies to the
      // previous one, chains more levels than MySQL can cascade: InnoDB
      // hard-limits nested foreign key cascades to 15 levels and fails the
      // delete with error 3008 beyond that, so `in_reply_to_id` cannot use
      // ON DELETE CASCADE and must be cleared in the delete transaction
      // https://dev.mysql.com/doc/mysql-reslimits-excerpt/8.0/en/ansi-diff-foreign-keys.html
      let previous = reply;
      for (let i = 0; i < 20; i++) {
        previous = await models.Comment.add({
          post_id: post.id,
          member_id: memberId,
          parent_id: root.id,
          in_reply_to_id: previous.id,
          html: `<p>Reply ${i} in a long conversation</p>`,
          status: 'published',
        });
      }

      const filter = `id:['${post.id}']`;
      const response = await agent
        .delete('/posts/?filter=' + encodeURIComponent(filter))
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        1,
        'Expect the post with threaded comments to be deleted',
      );

      const comments = await models.Base.knex('comments').where('post_id', post.id);
      assert.equal(
        comments.length,
        0,
        'Expected all comments on the post to be deleted with the post',
      );
    });

    it('Can delete all posts', async function () {
      const filter = 'status:[published,draft,scheduled,sent]';

      // Check all the posts that should be affected
      const changedPosts = await models.Post.findPage({ filter, limit: 1, status: 'all' });
      const amount = changedPosts.meta.pagination.total;

      assert(amount > 0, 'Expect at least one post to be affected for this test to work');

      const response = await agent
        .delete('/posts/?filter=' + encodeURIComponent(filter))
        .expectStatus(200)
        .matchBodySnapshot();

      assert.equal(
        response.body.bulk.meta.stats.successful,
        amount,
        `Expect all matching posts (${amount}) to be deleted, got ${response.body.bulk.meta.stats.successful} instead`,
      );

      // Check if all posts were deleted
      const posts = await models.Post.findPage({ filter, status: 'all' });
      assert.equal(
        posts.meta.pagination.total,
        0,
        `Expect all matching posts (${amount}) to be deleted`,
      );
    });
  });
});
