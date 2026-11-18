import assert from 'node:assert/strict';
import sinon from 'sinon';
import _ from 'lodash';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../../utils';
// @ts-expect-error This module lacks type definitions.
import models = require('../../../../../core/server/models');
import type permissionsType from '../../../../../core/server/auth/permissions';
import type providersType from '../../../../../core/server/auth/permissions/providers';
import type * as limitsType from '../../../../../core/server/services/limits';
import * as rolePermissions from '../../../../../core/server/auth/permissions/role-permissions';

// require(), not import: the stubs must patch the instances the models load
const permissions: typeof permissionsType = require('../../../../../core/server/auth/permissions');
const providers: typeof providersType =
  require('../../../../../core/server/auth/permissions/providers').default;
const { limitService }: typeof limitsType = require('../../../../../core/server/services/limits');

// Tests pass fake contexts, ids and provider results the real types reject
const canThis = permissions.canThis as (
  context?: unknown,
) => Record<string, Record<string, (...args: unknown[]) => Promise<any>>>;
const stubProvider = (name: 'user' | 'apiKey'): sinon.SinonStub => sinon.stub(providers, name);

describe('Permissions', function () {
  let findPostSpy: sinon.SinonStub;
  let findTagSpy: sinon.SinonStub;

  beforeEach(function () {
    findPostSpy = sinon.stub(models.Post, 'findOne').callsFake(function () {
      // @TODO: the test env has no concept of including relations
      const post = models.Post.forge(testUtils.DataGenerator.Content.posts[0]);

      const authors = [testUtils.DataGenerator.Content.users[0]];

      post.related('authors').set(authors);
      return Promise.resolve(post);
    });

    findTagSpy = sinon.stub(models.Tag, 'findOne').callsFake(function () {
      return Promise.resolve({});
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('CanThis', function () {
    it('canThisResult gets build properly', function () {
      const canThisResult = canThis();

      assert(_.isPlainObject(canThisResult.browse));
      assert.equal(typeof canThisResult.browse.post, 'function');

      assert(_.isPlainObject(canThisResult.edit));
      assert.equal(typeof canThisResult.edit.post, 'function');
      assert.equal(typeof canThisResult.edit.tag, 'function');
      assert.equal(typeof canThisResult.edit.user, 'function');

      assert(_.isPlainObject(canThisResult.add));
      assert.equal(typeof canThisResult.add.post, 'function');
      assert.equal(typeof canThisResult.add.user, 'function');

      assert(_.isPlainObject(canThisResult.destroy));
      assert.equal(typeof canThisResult.destroy.post, 'function');
      assert.equal(typeof canThisResult.destroy.user, 'function');
    });

    describe('Non user permissions', function () {
      // TODO change to using fake models in tests!
      // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
      // It can depend on bookshelf, but should NOT use hard coded model knowledge.
      describe('with permissible calls (post model)', function () {
        it('No context: does not allow edit post (no model)', async function () {
          await assert.rejects(
            canThis() // no context
              .edit.post(), // post id
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.notCalled(findPostSpy);
        });

        it('No context: does not allow edit post (model syntax)', async function () {
          await assert.rejects(
            canThis() // no context
              .edit.post({ id: 1 }), // post id in model syntax
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.calledOnce(findPostSpy);
          assert.deepEqual(findPostSpy.firstCall.args[0], { id: 1, status: 'all' });
        });

        it('No context: does not allow edit post (model ID syntax)', async function () {
          await assert.rejects(
            canThis({}) // no context
              .edit.post(1), // post id using number syntax
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.calledOnce(findPostSpy);
          assert.deepEqual(findPostSpy.firstCall.args[0], { id: 1, status: 'all' });
        });

        it('Internal context: instantly grants permissions', async function () {
          await canThis({ internal: true }) // internal context
            .edit.post({ id: 1 }); // post id

          // We don't get this far, permissions are instantly granted for internal
          sinon.assert.notCalled(findPostSpy);
        });

        it('External context: does not grant permissions', async function () {
          await assert.rejects(
            canThis({ external: true }) // internal context
              .edit.post({ id: 1 }), // post id
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.calledOnce(findPostSpy);
          assert.deepEqual(findPostSpy.firstCall.args[0], { id: 1, status: 'all' });
        });
      });

      describe('without permissible (tag model)', function () {
        it('No context: does not allow edit tag (model syntax)', async function () {
          await assert.rejects(
            canThis() // no context
              .edit.tag({ id: 1 }), // tag id in model syntax
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          // We don't look up tags
          sinon.assert.notCalled(findTagSpy);
        });

        it('Internal context: instantly grants permissions', async function () {
          await canThis({ internal: true }) // internal context
            .edit.tag({ id: 1 }); // tag id

          // We don't look up tags
          sinon.assert.notCalled(findTagSpy);
        });

        it('External context: does not grant permissions', async function () {
          await assert.rejects(
            canThis({ external: true }) // external context
              .edit.tag({ id: 1 }), // tag id
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.notCalled(findTagSpy);
        });
      });
    });

    describe('User-based permissions', function () {
      // TODO change to using fake models in tests!
      // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
      // It can depend on bookshelf, but should NOT use hard coded model knowledge.
      // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
      it('No permissions: cannot edit tag (no permissible function on model)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          // Fake the response from providers.user, which contains permissions and roles
          return Promise.resolve({
            permissions: [],
            roles: [{ name: 'Contributor' }],
          });
        });

        await assert.rejects(
          canThis({ user: {} }) // user context
            .edit.tag({ id: 1 }), // tag id in model syntax
          function (err: any) {
            sinon.assert.calledOnce(userProviderStub);
            assert.equal(err.errorType, 'NoPermissionError');
            return true;
          },
        );
      });

      it('With permissions: can edit specific tag (no permissible function on model)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          // Fake the response from providers.user, which contains permissions and roles
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [{ name: 'Administrator' }],
          });
        });

        const res = await canThis({ user: {} }) // user context
          .edit.tag({ id: 1 }); // tag id in model syntax

        sinon.assert.calledOnce(userProviderStub);
        assert.equal(res, undefined);
      });

      it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          // Fake the response from providers.user, which contains permissions and roles
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [{ name: 'Administrator' }],
          });
        });

        const res = await canThis({ user: {} }) // user context
          .edit.tag(); // tag id in model syntax

        sinon.assert.calledOnce(userProviderStub);
        assert.equal(res, undefined);
      });

      it('With owner role: can edit tag (no permissible function on model)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          // Fake the response from providers.user, which contains permissions and roles
          return Promise.resolve({
            permissions: [],
            // This should be JSON, so no need to run it through the model layer. 3 === owner
            roles: [testUtils.DataGenerator.Content.roles[3]],
          });
        });

        const res = await canThis({ user: {} }) // user context
          .edit.tag({ id: 1 }); // tag id in model syntax

        sinon.assert.calledOnce(userProviderStub);
        assert.equal(res, undefined);
      });
    });

    describe('API Key-based permissions', function () {
      // TODO change to using fake models in tests!
      // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
      // It can depend on bookshelf, but should NOT use hard coded model knowledge.
      // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
      it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          // Fake the response from providers.user, which contains permissions and roles
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            // This should be JSON, so no need to run it through the model layer. 5 === admin api key
            roles: [testUtils.DataGenerator.Content.roles[5]],
          });
        });
        const res = await canThis({
          api_key: {
            id: 123,
          },
        }) // api key context
          .edit.tag({ id: 1 }); // tag id in model syntax

        sinon.assert.calledOnce(apiKeyProviderStub);
        assert.equal(res, undefined);
      });
    });

    describe('Combined User + API Key permissions (staff API key scenarios)', function () {
      // Tests for when both user and API key are present in context
      // This is the scenario introduced by staff API keys where a user can have an associated API key

      it('Current behavior: User with permission + API key with permission (should pass with current logic)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [{ name: 'Administrator' }],
          });
        });

        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [testUtils.DataGenerator.Content.roles[5]], // admin api key role
          });
        });

        const res = await canThis({
          user: { id: 1 },
          api_key: { id: 123, type: 'admin' },
        }).edit.tag({ id: 1 });

        sinon.assert.calledOnce(userProviderStub);
        sinon.assert.calledOnce(apiKeyProviderStub);
        assert.equal(res, undefined);
      });

      it('Fixed behavior: User with permission + API key without permission (now uses USER permission and passes)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [{ name: 'Administrator' }],
          });
        });

        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          return Promise.resolve({
            permissions: [], // API key has no permissions
            roles: [],
          });
        });

        const res = await canThis({
          user: { id: 1 },
          api_key: { id: 123, type: 'admin' },
        }).edit.tag({ id: 1 });

        sinon.assert.calledOnce(userProviderStub);
        sinon.assert.calledOnce(apiKeyProviderStub);
        assert.equal(res, undefined);
        // Fixed: Now uses USER permission instead of API key logic
      });

      it('Fixed behavior: User without permission + API key with permission (now uses USER permission and fails)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          return Promise.resolve({
            permissions: [], // User has no permissions
            roles: [{ name: 'Contributor' }],
          });
        });

        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          return Promise.resolve({
            permissions: testUtils.DataGenerator.Content.permissions,
            roles: [testUtils.DataGenerator.Content.roles[5]],
          });
        });

        await assert.rejects(
          canThis({
            user: { id: 1 },
            api_key: { id: 123, type: 'admin' },
          }).edit.tag({ id: 1 }),
          function (err: any) {
            sinon.assert.calledOnce(userProviderStub);
            sinon.assert.calledOnce(apiKeyProviderStub);
            assert.equal(err.errorType, 'NoPermissionError');
            // Fixed: Now uses USER permission instead of API key logic
            return true;
          },
        );
      });

      it('Current behavior: User without permission + API key without permission (should fail)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          return Promise.resolve({
            permissions: [],
            roles: [{ name: 'Contributor' }],
          });
        });

        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          return Promise.resolve({
            permissions: [],
            roles: [],
          });
        });

        await assert.rejects(
          canThis({
            user: { id: 1 },
            api_key: { id: 123, type: 'admin' },
          }).edit.tag({ id: 1 }),
          function (err: any) {
            sinon.assert.calledOnce(userProviderStub);
            sinon.assert.calledOnce(apiKeyProviderStub);
            assert.equal(err.errorType, 'NoPermissionError');
            return true;
          },
        );
      });

      it('Current behavior: Owner user + API key without permission (owner should override)', async function () {
        const userProviderStub = stubProvider('user').callsFake(function () {
          return Promise.resolve({
            permissions: [],
            roles: [testUtils.DataGenerator.Content.roles[3]], // owner role
          });
        });

        const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
          return Promise.resolve({
            permissions: [],
            roles: [],
          });
        });

        const res = await canThis({
          user: { id: 1 },
          api_key: { id: 123, type: 'admin' },
        }).edit.tag({ id: 1 });

        sinon.assert.calledOnce(userProviderStub);
        sinon.assert.calledOnce(apiKeyProviderStub);
        assert.equal(res, undefined);
      });

      // Tests for NEW expected behavior after fix
      describe('Expected behavior after fix: User permissions should take precedence', function () {
        it('Expected: User with permission + API key without permission (should use USER permission and pass)', async function () {
          const userProviderStub = stubProvider('user').callsFake(function () {
            return Promise.resolve({
              permissions: testUtils.DataGenerator.Content.permissions,
              roles: [{ name: 'Administrator' }],
            });
          });

          const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
            return Promise.resolve({
              permissions: [], // API key has no permissions
              roles: [],
            });
          });

          const res = await canThis({
            user: { id: 1 },
            api_key: { id: 123, type: 'admin' },
          }).edit.tag({ id: 1 });

          sinon.assert.calledOnce(userProviderStub);
          sinon.assert.calledOnce(apiKeyProviderStub);
          assert.equal(res, undefined);
        });

        it('Expected: User without permission + API key with permission (should use USER permission and fail)', async function () {
          const userProviderStub = stubProvider('user').callsFake(function () {
            return Promise.resolve({
              permissions: [], // User has no permissions
              roles: [{ name: 'Contributor' }],
            });
          });

          const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
            return Promise.resolve({
              permissions: testUtils.DataGenerator.Content.permissions,
              roles: [testUtils.DataGenerator.Content.roles[5]],
            });
          });

          await assert.rejects(
            canThis({
              user: { id: 1 },
              api_key: { id: 123, type: 'admin' },
            }).edit.tag({ id: 1 }),
            function (err: any) {
              sinon.assert.calledOnce(userProviderStub);
              sinon.assert.calledOnce(apiKeyProviderStub);
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );
        });

        it('Expected: Owner user + API key without permission (should use USER permission and pass)', async function () {
          const userProviderStub = stubProvider('user').callsFake(function () {
            return Promise.resolve({
              permissions: [],
              roles: [testUtils.DataGenerator.Content.roles[3]], // owner role
            });
          });

          const apiKeyProviderStub = stubProvider('apiKey').callsFake(() => {
            return Promise.resolve({
              permissions: [],
              roles: [],
            });
          });

          const res = await canThis({
            user: { id: 1 },
            api_key: { id: 123, type: 'admin' },
          }).edit.tag({ id: 1 });

          sinon.assert.calledOnce(userProviderStub);
          sinon.assert.calledOnce(apiKeyProviderStub);
          assert.equal(res, undefined);
        });

        it('Expected: Author user + API key cannot update the visibility of their own post', async function () {
          const userProviderStub = stubProvider('user').callsFake(function () {
            return Promise.resolve({
              permissions: testUtils.DataGenerator.Content.permissions,
              roles: [testUtils.DataGenerator.Content.roles[2]], // Author role
            });
          });

          const apiKeyProviderStub = stubProvider('apiKey').callsFake(function () {
            return Promise.resolve({
              permissions: testUtils.DataGenerator.Content.permissions,
              roles: [testUtils.DataGenerator.Content.roles[5]], // Admin Integration
            });
          });

          await assert.rejects(
            canThis({
              user: testUtils.DataGenerator.Content.users[0].id,
              api_key: { id: 123, type: 'admin' },
            }).edit.post({ id: 1 }, { visibility: 'members' }),
            function (err: any) {
              assert.equal(err.errorType, 'NoPermissionError');
              return true;
            },
          );

          sinon.assert.calledOnce(userProviderStub);
          sinon.assert.calledOnce(apiKeyProviderStub);
          sinon.assert.calledOnce(findPostSpy);
        });
      });
    });
  });

  describe('model rules and provider reads', function () {
    it('does not reread a post that disappears after authorization', async function () {
      const author = testUtils.DataGenerator.Content.users[0];
      const userProviderStub = stubProvider('user').resolves({
        permissions: rolePermissions.forRoles(['Author']),
        roles: [{ name: 'Author' }],
      });
      // A second read would observe the deletion.
      findPostSpy.onSecondCall().resolves(null);

      await canThis({ user: author.id }).destroy.post('post-1');

      sinon.assert.calledOnce(userProviderStub);
      sinon.assert.calledOnce(findPostSpy);
    });

    it('reads the post and checks publishing limits only once', async function () {
      const userProviderStub = stubProvider('user').resolves({
        permissions: rolePermissions.forRoles(['Administrator']),
        roles: [{ name: 'Administrator' }],
      });
      findPostSpy.resolves(models.Post.forge({ id: 'post-1', status: 'draft' }));
      sinon.stub(limitService, 'isLimited').withArgs('members').returns(true);
      const limitCheck = sinon.stub(limitService, 'errorIfIsOverLimit').resolves();

      await canThis({ user: 'admin-1' }).edit.post('post-1', { status: 'published' });

      sinon.assert.calledOnce(userProviderStub);
      sinon.assert.calledOnce(findPostSpy);
      sinon.assert.calledOnceWithExactly(limitCheck, 'members');
    });

    it('does not duplicate user reads or nested role-assignment checks', async function () {
      const userProviderStub = stubProvider('user').resolves({
        permissions: rolePermissions.forRoles(['Administrator']),
        roles: [{ id: 'admin-role', name: 'Administrator' }],
      });
      const user = models.User.forge({ id: 'target-user', status: 'active' });
      user.related('roles').set([{ id: 'author-role', name: 'Author' }]);
      const userRead = sinon.stub(models.User, 'findOne').resolves(user);
      const ownerRead = sinon.stub(models.User, 'getOwnerUser').resolves({ id: 'owner-user' });
      const role = models.Role.forge({ id: 'editor-role', name: 'Editor' });
      const roleRead = sinon.stub(models.Role, 'findOne').resolves(role);

      await canThis({ user: 'admin-1' }).edit.user('target-user', {
        roles: [{ id: role.id, name: 'Editor' }],
      });

      // One provider load for edit.user and one for its existing assign.role check.
      sinon.assert.calledTwice(userProviderStub);
      sinon.assert.calledOnce(userRead);
      sinon.assert.calledOnce(ownerRead);
      sinon.assert.calledOnce(roleRead);
    });
  });

  describe('permissible (overridden)', function () {
    it('can use permissible function on model to forbid something (post model)', async function () {
      const userProviderStub = stubProvider('user').callsFake(function () {
        // Fake the response from providers.user, which contains permissions and roles
        return Promise.resolve({
          permissions: testUtils.DataGenerator.Content.permissions,
          roles: [{ name: 'Administrator' }],
        });
      });

      const permissibleStub = sinon.stub(models.Post, 'permissible').callsFake(function () {
        return Promise.reject({ message: 'Hello World!' });
      });

      await assert.rejects(
        canThis({ user: {} }) // user context
          .edit.post({ id: 1 }), // tag id in model syntax
        function (err: any) {
          sinon.assert.calledOnce(permissibleStub);
          sinon.assert.calledWith(
            permissibleStub,
            1,
            'edit',
            sinon.match.object,
            sinon.match.object,
            sinon.match.object,
            true,
            true,
          );

          sinon.assert.calledOnce(userProviderStub);
          assert.equal(err.message, 'Hello World!');
          return true;
        },
      );
    });

    it('can use permissible function on model to allow something (post model)', async function () {
      const userProviderStub = stubProvider('user').callsFake(function () {
        // Fake the response from providers.user, which contains permissions and roles
        return Promise.resolve({
          permissions: testUtils.DataGenerator.Content.permissions,
          roles: [{ name: 'Administrator' }],
        });
      });

      const permissibleStub = sinon.stub(models.Post, 'permissible').callsFake(function () {
        return Promise.resolve();
      });

      const res = await canThis({ user: {} }) // user context
        .edit.post({ id: 1 }); // tag id in model syntax

      sinon.assert.calledOnce(permissibleStub);
      sinon.assert.calledWith(
        permissibleStub,
        1,
        'edit',
        sinon.match.object,
        sinon.match.object,
        sinon.match.object,
        true,
        true,
      );

      sinon.assert.calledOnce(userProviderStub);
      assert.equal(res, undefined);
    });
  });

  describe('App principal', function () {
    const app = { id: 'installation' };
    const user = { id: '1', email: 'owner@example.com', name: 'Owner', status: 'active' };

    it('refuses an app with no user, before loading or asking the model', async function () {
      const userProviderStub = stubProvider('user');
      const apiKeyProviderStub = stubProvider('apiKey').rejects(new Error('lookup failed'));
      const permissibleStub = sinon.stub(models.Post, 'permissible').resolves();
      const context = {
        // A stale key beside the app must not be looked up
        api_key: { id: 'key', type: 'admin' },
        principal: {
          kind: 'app',
          method: 'oauth_client_credentials',
          app,
          actingFor: null,
          scopes: ['post:read'],
        },
      };

      for (const check of [canThis(context).browse.post(), canThis(context).edit.tag({ id: 1 })]) {
        await assert.rejects(check, { errorType: 'NoPermissionError' });
      }

      sinon.assert.notCalled(permissibleStub);
      sinon.assert.notCalled(userProviderStub);
      sinon.assert.notCalled(apiKeyProviderStub);
    });

    // Interim, until PLA-639 enforces scopes: the empty scopes here must deny once it lands
    it('treats an app acting for a user as that user, ignoring any key', async function () {
      const userProviderStub = stubProvider('user').resolves({
        permissions: testUtils.DataGenerator.Content.permissions,
        roles: [{ name: 'Administrator' }],
      });
      const apiKeyProviderStub = stubProvider('apiKey');
      const context = {
        user: '1',
        api_key: { id: 'key', type: 'admin' },
        principal: {
          kind: 'app',
          method: 'oauth_authorization_code',
          app,
          actingFor: user,
          scopes: [],
        },
      };

      assert.equal(await canThis(context).edit.tag({ id: 1 }), undefined);
      sinon.assert.calledOnceWithExactly(userProviderStub, '1');
      sinon.assert.notCalled(apiKeyProviderStub);
    });

    it('refuses an app acting for a user who lacks the permission', async function () {
      stubProvider('user').resolves({ permissions: [], roles: [{ name: 'Contributor' }] });
      const context = {
        user: '1',
        principal: {
          kind: 'app',
          method: 'oauth_authorization_code',
          app,
          actingFor: user,
          scopes: [],
        },
      };

      await assert.rejects(canThis(context).edit.tag({ id: 1 }), {
        errorType: 'NoPermissionError',
      });
    });
  });
});
