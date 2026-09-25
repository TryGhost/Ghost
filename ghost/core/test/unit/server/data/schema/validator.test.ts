import assert from 'node:assert/strict';
import _ from 'lodash';
import ObjectId from 'bson-objectid';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../../utils';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../core/server/models';
import { validateSchema } from '../../../../../core/server/data/schema/validator';

describe('Validate Schema', function () {
  describe('models.add', function () {
    it('blank model', function () {
      // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
      assert.throws(
        () => validateSchema('posts', models.Post.forge(), { method: 'insert' }),
        (err: unknown) => {
          if (!Array.isArray(err)) {
            return false;
          }
          assert.equal(err.length, 5);

          const errorMessages = _.map(err, function (object) {
            return object.message;
          }).join(',');

          // NOTE: Some of these fields are auto-filled in the model layer (e.g. created_at, created_at etc.)
          ['id', 'uuid', 'slug', 'title', 'created_at'].forEach(function (attr) {
            assert.match(errorMessages, RegExp('posts.' + attr));
          });
          return true;
        },
      );
    });

    it('blank id', function () {
      const postModel = models.Post.forge(
        testUtils.DataGenerator.forKnex.createPost({
          id: null,
          slug: 'test',
        }),
      );

      assert.throws(
        () => validateSchema('posts', postModel, { method: 'insert' }),
        (err: unknown) => {
          if (!Array.isArray(err)) {
            return false;
          }
          assert.equal(err.length, 1);
          assert.match(err[0].message, /posts\.id/);
          return true;
        },
      );
    });

    it('should pass', function () {
      validateSchema(
        'posts',
        models.Post.forge(testUtils.DataGenerator.forKnex.createPost({ slug: 'title' })),
        { method: 'insert' },
      );
    });

    it('transforms 0 and 1 (boolean)', function () {
      const user = models.User.forge(
        testUtils.DataGenerator.forKnex.createUser({
          email: 'test@example.com',
          comment_notifications: 0,
        }),
      );
      assert.equal(user.get('comment_notifications'), 0);

      validateSchema('users', user, { method: 'insert' });
      assert.equal(user.get('comment_notifications'), false);
    });

    it('keeps true or false', function () {
      const post = models.Post.forge(
        testUtils.DataGenerator.forKnex.createPost({ slug: 'test', featured: true }),
      );
      assert.equal(post.get('featured'), true);

      validateSchema('posts', post, { method: 'insert' });
      assert.equal(post.get('featured'), true);
    });
  });

  describe('webhooks.add', function () {
    it('event name is not lowercase', function () {
      const webhook = models.Webhook.forge(
        testUtils.DataGenerator.forKnex.createWebhook({
          event: 'Test',
          integration_id: testUtils.DataGenerator.Content.integrations[0].id,
        }),
      );

      // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
      assert.throws(
        () => validateSchema('webhooks', webhook, { method: 'insert' }),
        (err: unknown) => {
          if (!Array.isArray(err)) {
            return false;
          }
          assert.equal(err.length, 1);
          assert.equal(err[0].errorType, 'ValidationError');
          assert.match(err[0].message, /isLowercase/);
          return true;
        },
      );
    });
  });

  describe('models.edit', function () {
    it('uuid is invalid', function () {
      const postModel = models.Post.forge({ id: ObjectId().toHexString(), uuid: '1234' });

      postModel.changed = { uuid: postModel.get('uuid') };

      assert.throws(
        () => validateSchema('posts', postModel),
        (err: unknown) => {
          if (!Array.isArray(err)) {
            return false;
          }
          assert.equal(err.length, 1);
          assert.match(err[0].message, /isUUID/);
          return true;
        },
      );
    });

    it('date is null', function () {
      const postModel = models.Post.forge({ id: ObjectId().toHexString(), created_at: null });

      postModel.changed = { created_at: postModel.get('updated_at') };

      assert.throws(
        () => validateSchema('posts', postModel),
        (err: unknown) => {
          if (!Array.isArray(err)) {
            return false;
          }
          assert.equal(err.length, 1);
          assert.match(err[0].message, /posts\.created_at/);
          return true;
        },
      );
    });
  });
});
