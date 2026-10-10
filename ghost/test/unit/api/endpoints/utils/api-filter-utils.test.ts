import assert from 'node:assert/strict';
import {
  rejectAdminApiRestrictedFieldsTransformer,
  rejectAuthorsContentApiRestrictedFieldsTransformer,
  rejectAuthorsRestrictedOrderFields,
  rejectNewslettersContentApiRestrictedFieldsTransformer,
  rejectNewslettersContentApiRestrictedOrderFields,
  rejectPagesContentApiRestrictedFieldsTransformer,
  rejectPagesContentApiRestrictedOrderFields,
  rejectPostsContentApiRestrictedFieldsTransformer,
  rejectPostsContentApiRestrictedOrderFields,
  rejectTagsContentApiRestrictedFieldsTransformer,
  rejectTagsRestrictedOrderFields,
  restrictAdminApiQueryOptions,
  validateAdminApiBulkFilterTransformer,
  validateAdminApiRestrictedOrderFields,
} from '../../../../../core/server/api/endpoints/utils/api-filter-utils';

describe('API filter utils', function () {
  describe('author restrictions', function () {
    it('removes role filters through both relation names', function () {
      assert.deepEqual(
        rejectAuthorsContentApiRestrictedFieldsTransformer({
          $and: [
            { 'roles.name': 'Owner' },
            { 'roles_users.role_id': 'role-id' },
            { slug: 'ghost' },
          ],
        }),
        {
          $and: [{ slug: 'ghost' }],
        },
      );
    });

    it('removes restricted fields, repeated clauses, and schema aliases from ordering', function () {
      assert.equal(
        rejectAuthorsRestrictedOrderFields([
          'email desc',
          'name desc, last_seen asc',
          'mail desc',
          'word asc',
          'seen desc',
          'tatus asc',
          'slug asc',
        ]),
        'name desc,slug asc',
      );
    });
  });

  describe('post restrictions', function () {
    it('removes hidden staff, revision, metadata, and gated-body filters', function () {
      assert.deepEqual(
        rejectPostsContentApiRestrictedFieldsTransformer({
          $and: [
            { published_by: 'user-id' },
            { 'post_revisions.author_id': 'user-id' },
            { 'post_revisions.lexical': 'private draft' },
            { email_only: true },
            { html: 'gated body' },
            { locale: 'fr' },
            { newsletter_id: 'newsletter-id' },
            { show_title_and_feature_image: false },
            { status: 'published' },
          ],
        }),
        {
          $and: [{ status: 'published' }],
        },
      );
    });

    it('removes restricted post fields and schema aliases from ordering', function () {
      assert.equal(
        rejectPostsContentApiRestrictedOrderFields([
          'email_recipient_filter desc',
          'recipient_filter asc',
          'filter desc',
          'email_only desc',
          'locale desc',
          'newsletter_id desc',
          'published_by desc',
          'by asc',
          'show_title_and_feature_image desc',
          'lexical desc',
          'ical asc',
          'plaintext desc',
          'title asc',
        ]),
        'title asc',
      );
    });
  });

  describe('page restrictions', function () {
    it('removes fields hidden by the page serializer from filters and order aliases', function () {
      assert.deepEqual(
        rejectPagesContentApiRestrictedFieldsTransformer({
          $and: [
            { 'posts_meta.email_subject': 'private subject' },
            { newsletter_id: 'newsletter-id' },
            { html: 'gated body' },
            { slug: 'public-page' },
          ],
        }),
        {
          $and: [{ slug: 'public-page' }],
        },
      );

      assert.equal(
        rejectPagesContentApiRestrictedOrderFields([
          'email_subject desc',
          'subject asc',
          'newsletter_id desc',
          'title asc',
        ]),
        'title asc',
      );
    });
  });

  describe('tag restrictions', function () {
    it('removes hidden metadata while preserving public tag filters', function () {
      assert.deepEqual(
        rejectTagsContentApiRestrictedFieldsTransformer({
          $and: [
            { created_at: { $gt: '2020-01-01' } },
            { 'tags.updated_at': { $lt: '2025-01-01' } },
            { 'tags.CREATED_AT': '2020-01-01' },
            { parent_id: 'private-parent-id' },
            { 'tags.parent': 'private-parent-id' },
            { $or: [{ updated_at: '2020-01-01' }, { slug: 'news' }] },
            { visibility: 'public' },
          ],
        }),
        {
          $and: [{ $or: [{ slug: 'news' }] }, { visibility: 'public' }],
        },
      );
    });

    it('removes hidden metadata and suffix aliases from repeated order clauses', function () {
      assert.equal(
        rejectTagsRestrictedOrderFields([
          'created_at desc,tags.updated_at asc',
          'tags.CREATED_AT desc',
          'ated_at desc',
          'parent_id asc',
          'tags.parent desc',
          'nt_id asc',
          'name desc,slug asc',
          'visibility asc',
          'count.posts desc',
          'id asc',
        ]),
        'name desc,slug asc,visibility asc,count.posts desc,id asc',
      );
    });

    it('uses the default order when every requested clause is restricted', function () {
      assert.equal(rejectTagsRestrictedOrderFields('updated_at desc,nt_id asc'), undefined);
    });
  });

  describe('tag relation restrictions', function () {
    for (const { resource, transformer, order } of [
      {
        resource: 'post',
        transformer: rejectPostsContentApiRestrictedFieldsTransformer,
        order: rejectPostsContentApiRestrictedOrderFields,
      },
      {
        resource: 'page',
        transformer: rejectPagesContentApiRestrictedFieldsTransformer,
        order: rejectPagesContentApiRestrictedOrderFields,
      },
    ]) {
      it(`removes hidden tag paths while preserving public ${resource} filters`, function () {
        assert.deepEqual(
          transformer({
            $and: [
              { 'tags.updated_at': { $gt: '2020-01-01' } },
              { 'tag.created_at': '2020-01-01' },
              { 'primary_tag.parent_id': 'private-parent-id' },
              { 'tags.parent': 'private-parent-id' },
              { 'tags.UPDATED_AT': '2020-01-01' },
              { created_at: { $gt: '2020-01-01' } },
              { updated_at: { $gt: '2020-01-01' } },
              { tag: 'news' },
              { tags: 'news' },
              { primary_tag: 'news' },
              { 'tags.slug': 'news' },
              { 'tags.visibility': 'public' },
            ],
          }),
          {
            $and: [
              { created_at: { $gt: '2020-01-01' } },
              { updated_at: { $gt: '2020-01-01' } },
              { tag: 'news' },
              { tags: 'news' },
              { primary_tag: 'news' },
              { 'tags.slug': 'news' },
              { 'tags.visibility': 'public' },
            ],
          },
        );
      });

      it(`preserves ordering by public ${resource} timestamps`, function () {
        assert.equal(
          order('tags.updated_at desc,created_at asc,updated_at desc'),
          'created_at asc,updated_at desc',
        );
      });
    }
  });

  describe('newsletter restrictions', function () {
    it('allows only exact fields exposed by the Content API newsletter serializer', function () {
      assert.deepEqual(
        rejectNewslettersContentApiRestrictedFieldsTransformer({
          $and: [
            { sender_email: 'public@example.com' },
            { 'newsletters.name': 'public' },
            { 'private.name': 'not-a-reviewed-path' },
            { sender_reply_to: 'private@example.com' },
            { footer_content: 'private footer' },
          ],
        }),
        {
          $and: [{ sender_email: 'public@example.com' }, { 'newsletters.name': 'public' }],
        },
      );

      assert.equal(
        rejectNewslettersContentApiRestrictedOrderFields([
          'sender_reply_to desc',
          'reply_to asc',
          'name asc',
        ]),
        'name asc',
      );
    });
  });

  describe('rejectAdminApiRestrictedFieldsTransformer', function () {
    it('removes restricted fields from read filters', function () {
      assert.deepEqual(
        rejectAdminApiRestrictedFieldsTransformer({
          $and: [{ 'authors.password': 'hash' }, { status: 'published' }],
        }),
        {
          $and: [{ status: 'published' }],
        },
      );
    });

    it('removes every withheld column, not just password', function () {
      for (const field of ['token', 'invites.token', 'gift_link_token', 'secret']) {
        assert.deepEqual(
          rejectAdminApiRestrictedFieldsTransformer({
            $and: [{ [field]: { $regex: '^guess' } }, { status: 'sent' }],
          }),
          {
            $and: [{ status: 'sent' }],
          },
        );
      }
    });
  });

  describe('validateAdminApiRestrictedOrderFields', function () {
    it('returns falsy and public order values unchanged', function () {
      assert.equal(validateAdminApiRestrictedOrderFields(undefined), undefined);
      assert.equal(validateAdminApiRestrictedOrderFields(''), '');
      assert.equal(validateAdminApiRestrictedOrderFields('name ASC'), 'name ASC');
      assert.equal(
        validateAdminApiRestrictedOrderFields('count.posts desc,name asc'),
        'count.posts desc,name asc',
      );
    });

    it('rejects a restricted field in any clause, direction or table prefix', function () {
      for (const order of [
        'password',
        'password ASC',
        'users.password DESC',
        'name asc,password desc',
        'invites.token ASC',
        'gift_link_token desc',
        'secret',
      ]) {
        assert.throws(() => validateAdminApiRestrictedOrderFields(order), {
          name: 'BadRequestError',
          message: 'Restricted fields cannot be used in order.',
        });
      }
    });

    it('matches restricted field names case-insensitively', function () {
      assert.throws(() => validateAdminApiRestrictedOrderFields('Users.Password DESC'), {
        name: 'BadRequestError',
      });
    });

    it('rejects suffix aliases that bookshelf-order resolves to a restricted column', function () {
      for (const order of [
        'word asc',
        'ssword desc',
        'oken asc',
        'en desc',
        'ecret asc',
        'link_token asc',
        '.token asc',
        'name asc,word desc',
      ]) {
        assert.throws(() => validateAdminApiRestrictedOrderFields(order), {
          name: 'BadRequestError',
          message: 'Restricted fields cannot be used in order.',
        });
      }
    });

    it('does not treat public columns as suffix aliases', function () {
      for (const order of [
        'id asc',
        'name asc',
        'slug desc',
        'email asc',
        'status asc',
        'role_id asc',
        'expires desc',
        'created_at desc',
        'users.name asc',
      ]) {
        assert.equal(validateAdminApiRestrictedOrderFields(order), order);
      }
    });

    it('rejects a restricted field supplied as a repeated order option', function () {
      assert.throws(() => validateAdminApiRestrictedOrderFields(['name asc', 'password desc']), {
        name: 'BadRequestError',
      });
    });
  });

  describe('restrictAdminApiQueryOptions', function () {
    it('adds the restricted-fields transformer to the query options', function () {
      const options = restrictAdminApiQueryOptions({ limit: 5 });

      assert.equal(options.limit, 5);
      assert.deepEqual(
        options.mongoTransformer({
          $and: [{ token: 'guess' }, { status: 'sent' }],
        }),
        { $and: [{ status: 'sent' }] },
      );
    });

    it('chains onto a transformer an input serializer already set', function () {
      const existing = (input: unknown) => ({ ...(input as object), tagged: true });
      const options = restrictAdminApiQueryOptions({ mongoTransformer: existing });

      assert.deepEqual(
        options.mongoTransformer({
          $and: [{ password: 'guess' }, { status: 'active' }],
        }),
        { $and: [{ status: 'active' }], tagged: true },
      );
    });

    it('throws before querying when order references a restricted field', function () {
      assert.throws(() => restrictAdminApiQueryOptions({ order: 'password ASC' }), {
        name: 'BadRequestError',
        message: 'Restricted fields cannot be used in order.',
      });
    });

    it('leaves a public order clause untouched', function () {
      assert.equal(restrictAdminApiQueryOptions({ order: 'name ASC' }).order, 'name ASC');
    });
  });

  describe('validateAdminApiBulkFilterTransformer', function () {
    it('returns bulk filters without restricted fields unchanged', function () {
      const filter = {
        $and: [{ status: 'draft' }, { type: 'post' }],
      };

      assert.equal(validateAdminApiBulkFilterTransformer(filter), filter);
    });

    it('rejects restricted fields anywhere in a bulk filter path', function () {
      assert.throws(
        () =>
          validateAdminApiBulkFilterTransformer({
            $or: [{ status: 'draft' }, { 'authors.password.hash': 'guess' }],
          }),
        {
          name: 'BadRequestError',
          message: 'Restricted fields cannot be used in bulk operation filters.',
        },
      );
    });

    it('matches restricted field names case-insensitively', function () {
      assert.throws(
        () =>
          validateAdminApiBulkFilterTransformer({
            'authors.Password': 'guess',
          }),
        {
          name: 'BadRequestError',
        },
      );
    });
  });
});
