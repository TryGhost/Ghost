import assert from 'node:assert/strict';
import sinon from 'sinon';
import _ from 'lodash';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../../utils';
// @ts-expect-error This module lacks type definitions.
import models = require('../../../../../core/server/models');
import type permissionsType from '../../../../../core/server/auth/permissions';
import type * as limitsType from '../../../../../core/server/services/limits';
import { toCheckResult } from '../../../../../core/server/auth/permissions/can-this';

// require(), not import: the stubs must patch the instances the models load
const permissions: typeof permissionsType = require('../../../../../core/server/auth/permissions');
const { limitService }: typeof limitsType = require('../../../../../core/server/services/limits');

// Tests pass fake contexts, ids and provider results the real types reject
const canThis = permissions.canThis as (
  context?: unknown,
) => Record<string, Record<string, (...args: unknown[]) => Promise<any>>>;

// Authentication puts the roles on the principal, so a context carries them
const userView = (roles: string[], id = '1') => ({
  id,
  email: 'staff@example.com',
  name: 'Staff',
  status: 'active',
  roles: roles.map((name) => ({ id: `role-${name}`, name })),
});
const keyView = (role: string | null, userId: string | null = null) => ({
  id: 'key',
  type: role || userId ? 'admin' : 'content',
  user_id: userId,
  integration_id: userId ? null : 'integration',
  role: role ? { id: `role-${role}`, name: role } : null,
});
const staff = (roles: string[], id = '1') => ({
  user: id,
  principal: { kind: 'user', method: 'session', user: userView(roles, id) },
});
// A staff token's key has no role of its own
const staffToken = (roles: string[], id = '1') => ({
  user: id,
  api_key: { id: 'key', type: 'admin' },
  principal: {
    kind: 'user',
    method: 'staff_token',
    user: userView(roles, id),
    apiKey: keyView(null, id),
  },
});
const integrationKey = (role: string | null) => ({
  api_key: { id: 'key', type: role ? 'admin' : 'content' },
  principal: {
    kind: 'integration',
    method: role ? 'admin_api_key' : 'content_api_key',
    apiKey: keyView(role),
    integration: null,
  },
});

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
      // The tag model has no permissible, so these check the grants alone
      it('No permissions: cannot edit tag (no permissible function on model)', async function () {
        await assert.rejects(canThis(staff(['Contributor'])).edit.tag({ id: 1 }), {
          errorType: 'NoPermissionError',
        });
      });

      it('With permissions: can edit specific tag (no permissible function on model)', async function () {
        assert.equal(await canThis(staff(['Administrator'])).edit.tag({ id: 1 }), undefined);
      });

      it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
        assert.equal(await canThis(staff(['Administrator'])).edit.tag(), undefined);
      });

      it('With owner role: can edit tag (no permissible function on model)', async function () {
        assert.equal(await canThis(staff(['Owner'])).edit.tag({ id: 1 }), undefined);
      });
    });

    describe('API Key-based permissions', function () {
      it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
        assert.equal(
          await canThis(integrationKey('Admin Integration')).edit.tag({ id: 1 }),
          undefined,
        );
      });

      it('Content key: cannot edit tag', async function () {
        await assert.rejects(canThis(integrationKey(null)).edit.tag({ id: 1 }), {
          errorType: 'NoPermissionError',
        });
      });
    });

    describe('Staff tokens use their user’s roles', function () {
      it('passes when the user has the permission', async function () {
        assert.equal(await canThis(staffToken(['Administrator'])).edit.tag({ id: 1 }), undefined);
      });

      it('fails when the user lacks the permission', async function () {
        await assert.rejects(canThis(staffToken(['Contributor'])).edit.tag({ id: 1 }), {
          errorType: 'NoPermissionError',
        });
      });

      it('passes for an Owner', async function () {
        assert.equal(await canThis(staffToken(['Owner'])).edit.tag({ id: 1 }), undefined);
      });

      it('an Author cannot update the visibility of their own post', async function () {
        const author = testUtils.DataGenerator.Content.users[0].id;
        await assert.rejects(
          canThis(staffToken(['Author'], author)).edit.post({ id: 1 }, { visibility: 'members' }),
          { errorType: 'NoPermissionError' },
        );
        sinon.assert.calledOnce(findPostSpy);
      });
    });
  });

  describe('model rules', function () {
    it('does not reread a post that disappears after authorization', async function () {
      const author = testUtils.DataGenerator.Content.users[0];
      // A second read would observe the deletion.
      findPostSpy.onSecondCall().resolves(null);

      await canThis(staff(['Author'], author.id)).destroy.post('post-1');

      sinon.assert.calledOnce(findPostSpy);
    });

    it('reads the post and checks publishing limits only once', async function () {
      findPostSpy.resolves(models.Post.forge({ id: 'post-1', status: 'draft' }));
      sinon.stub(limitService, 'isLimited').withArgs('members').returns(true);
      const limitCheck = sinon.stub(limitService, 'errorIfIsOverLimit').resolves();

      await canThis(staff(['Administrator'], 'admin-1')).edit.post('post-1', {
        status: 'published',
      });

      sinon.assert.calledOnce(findPostSpy);
      sinon.assert.calledOnceWithExactly(limitCheck, 'members');
    });

    it('does not duplicate user reads or nested role-assignment checks', async function () {
      const user = models.User.forge({ id: 'target-user', status: 'active' });
      user.related('roles').set([{ id: 'author-role', name: 'Author' }]);
      const userRead = sinon.stub(models.User, 'findOne').resolves(user);
      const ownerRead = sinon.stub(models.User, 'getOwnerUser').resolves({ id: 'owner-user' });
      const role = models.Role.forge({ id: 'editor-role', name: 'Editor' });
      const roleRead = sinon.stub(models.Role, 'findOne').resolves(role);

      // The nested assign.role check reuses the principal, so nothing reloads the acting user
      await canThis(staff(['Administrator'], 'admin-1')).edit.user('target-user', {
        roles: [{ id: role.id, name: 'Editor' }],
      });

      sinon.assert.calledOnce(userRead);
      sinon.assert.calledOnce(ownerRead);
      sinon.assert.calledOnce(roleRead);
    });
  });

  describe('permissible (overridden)', function () {
    it('can use permissible function on model to forbid something (post model)', async function () {
      const permissibleStub = sinon.stub(models.Post, 'permissible').callsFake(function () {
        return Promise.reject({ message: 'Hello World!' });
      });

      await assert.rejects(
        canThis(staff(['Administrator'])).edit.post({ id: 1 }),
        function (err: any) {
          sinon.assert.calledOnceWithMatch(
            permissibleStub,
            1,
            'edit',
            sinon.match.object,
            sinon.match.object,
            sinon.match.object,
            true,
            true,
          );
          assert.equal(err.message, 'Hello World!');
          return true;
        },
      );
    });

    it('can use permissible function on model to allow something (post model)', async function () {
      const permissibleStub = sinon.stub(models.Post, 'permissible').resolves();

      assert.equal(await canThis(staff(['Administrator'])).edit.post({ id: 1 }), undefined);
      sinon.assert.calledOnceWithMatch(
        permissibleStub,
        1,
        'edit',
        sinon.match.object,
        sinon.match.object,
        sinon.match.object,
        true,
        true,
      );
    });

    it('gives the model hooks the role ids, and no key for a staff token', async function () {
      const permissibleStub = sinon.stub(models.User, 'permissible').resolves();
      await canThis(staffToken(['Editor'])).edit.user('2');

      const loaded = permissibleStub.firstCall.args[4];
      assert.deepEqual(loaded.user.roles, [{ id: 'role-Editor', name: 'Editor' }]);
      assert.equal(loaded.apiKey, null);
    });
  });

  describe('principal required', function () {
    const refused = { errorType: 'IncorrectUsageError' };

    it('refuses a user or key context with no principal, without asking the model', async function () {
      const permissibleStub = sinon.stub(models.Post, 'permissible').resolves();
      await assert.rejects(canThis({ user: '1' }).edit.tag({ id: 1 }), refused);
      await assert.rejects(
        canThis({ api_key: { id: 'key', type: 'admin' } }).edit.post({ id: 1 }),
        refused,
      );
      sinon.assert.notCalled(permissibleStub);
    });

    it('refuses a context whose user or key is not its principal’s', async function () {
      await assert.rejects(canThis({ ...staff(['Administrator']), user: '2' }).edit.tag(), refused);
      await assert.rejects(
        canThis({
          ...integrationKey('Admin Integration'),
          api_key: { id: 'other', type: 'admin' },
        }).edit.tag(),
        refused,
      );
      await assert.rejects(
        canThis({ ...integrationKey('Admin Integration'), user: '1' }).edit.tag(),
        refused,
      );
      await assert.rejects(
        canThis({ user: '1', principal: { kind: 'anonymous' } }).edit.tag(),
        refused,
      );
    });

    it('fails only when a check runs', function () {
      assert.doesNotThrow(() => canThis({ user: '1' }));
    });

    it('lets an internal context through without one', async function () {
      assert.equal(await canThis({ internal: true, user: '1' }).edit.tag(), undefined);
    });
  });

  describe('App principal', function () {
    const app = { id: 'installation' };

    it('refuses an app with no user, before asking the model', async function () {
      const permissibleStub = sinon.stub(models.Post, 'permissible').resolves();
      const context = {
        // A stale key beside the app is never used
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
    });

    const appFor = (scopes: string[], roles = ['Administrator']) => ({
      user: '1',
      // A stale key beside the app is never used
      api_key: { id: 'key', type: 'admin' },
      principal: {
        kind: 'app',
        method: 'oauth_authorization_code',
        app,
        actingFor: userView(roles),
        scopes,
      },
    });

    it('treats an app acting for a user as that user, within its scopes, ignoring any key', async function () {
      assert.equal(await canThis(appFor(['tag:edit'])).edit.tag({ id: 1 }), undefined);
    });

    it('refuses an app acting for a user who lacks the permission', async function () {
      await assert.rejects(canThis(appFor(['tag:edit'], ['Contributor'])).edit.tag({ id: 1 }), {
        errorType: 'NoPermissionError',
      });
    });

    it('refuses a key outside the app scopes before asking the model', async function () {
      const permissibleStub = sinon.stub(models.Post, 'permissible').resolves();

      for (const scopes of [[], ['post:read']]) {
        await assert.rejects(canThis(appFor(scopes)).edit.post({ id: 1 }), {
          errorType: 'NoPermissionError',
        });
        await assert.rejects(canThis(appFor(scopes)).edit.tag({ id: 1 }), {
          errorType: 'NoPermissionError',
        });
      }

      // Scopes the app was issued without must not fall back to the user's full role
      const unscoped = appFor([]);
      delete (unscoped.principal as { scopes?: string[] }).scopes;
      await assert.rejects(canThis(unscoped).edit.post({ id: 1 }), {
        errorType: 'NoPermissionError',
      });

      sinon.assert.notCalled(permissibleStub);
      assert.equal(await canThis(appFor(['post:edit'])).edit.post({ id: 1 }), undefined);
      sinon.assert.calledOnce(permissibleStub);
    });
  });

  describe('row rule results', function () {
    // A rule's excludedAttrs reach the endpoint filter, as a hook's result does
    it('keeps excludedAttrs and is otherwise undefined', function () {
      assert.deepEqual(toCheckResult({ excludedAttrs: ['slug'] }), { excludedAttrs: ['slug'] });
      assert.equal(toCheckResult({}), undefined);
    });
  });

  describe('internal principal', function () {
    it('grants nothing to a principal claiming internal without an internal context', async function () {
      await assert.rejects(canThis({ principal: { kind: 'internal' } }).edit.tag(), {
        errorType: 'NoPermissionError',
      });
    });
  });
});
