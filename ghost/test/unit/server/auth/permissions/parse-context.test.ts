import assert from 'node:assert/strict';
import parseContext from '../../../../../core/server/auth/permissions/parse-context';

describe('Permissions', function () {
  describe('parseContext', function () {
    it('should return public for no context', function () {
      assert.deepEqual(parseContext(), {
        internal: false,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: true,
        integration: null,
      });
      assert.deepEqual(parseContext({}), {
        internal: false,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: true,
        integration: null,
      });
    });

    it('should return public for random context', function () {
      assert.deepEqual(parseContext('public'), {
        internal: false,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: true,
        integration: null,
      });
      assert.deepEqual(parseContext({ client: 'thing' }), {
        internal: false,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: true,
        integration: null,
      });
    });

    it('should return user if user populated', function () {
      assert.deepEqual(parseContext({ user: 1 }), {
        internal: false,
        user: 1,
        api_key: null,
        member: null,
        principal: null,
        public: false,
        integration: null,
      });
    });

    it('should return api_key and public context if content api_key provided', function () {
      assert.deepEqual(
        parseContext({
          api_key: {
            id: 1,
            type: 'content',
          },
          integration: { id: 2 },
        }),
        {
          internal: false,
          user: null,
          api_key: {
            id: 1,
            type: 'content',
          },
          member: null,
          principal: null,
          public: true,
          integration: { id: 2 },
        },
      );
    });

    it('should return api_key and non public context if admin api_key provided', function () {
      assert.deepEqual(
        parseContext({
          api_key: {
            id: 1,
            type: 'admin',
          },
          integration: { id: 3 },
        }),
        {
          internal: false,
          user: null,
          api_key: {
            id: 1,
            type: 'admin',
          },
          member: null,
          principal: null,
          public: false,
          integration: { id: 3 },
        },
      );
    });

    it('should return both user and api_key when both provided (staff API key scenario)', function () {
      assert.deepEqual(
        parseContext({
          user: { id: 1 },
          api_key: {
            id: 2,
            type: 'admin',
          },
          integration: { id: 3 },
        }),
        {
          internal: false,
          user: { id: 1 },
          api_key: {
            id: 2,
            type: 'admin',
          },
          member: null,
          principal: null,
          public: false,
          integration: { id: 3 },
        },
      );
    });

    it('should return internal if internal provided', function () {
      assert.deepEqual(parseContext({ internal: true }), {
        internal: true,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: false,
        integration: null,
      });

      assert.deepEqual(parseContext('internal'), {
        internal: true,
        user: null,
        api_key: null,
        member: null,
        principal: null,
        public: false,
        integration: null,
      });
    });

    describe('with a principal', function () {
      const contentKey = { id: 1, type: 'content' };
      const adminKey = { id: 1, type: 'admin' };
      const user = { id: '1', email: 'owner@example.com', name: 'Owner', status: 'active' };

      it('keeps a user principal private, whole', function () {
        const principal = { kind: 'user', method: 'session', user, scopes: ['post:browse'] };
        const parsed = parseContext({ user: '1', principal });

        assert.equal(parsed.principal, principal);
        assert.equal(parsed.public, false);
      });

      it('never treats a user principal with no user as public', function () {
        const parsed = parseContext({ principal: { kind: 'user', method: 'staff_token', user } });

        assert.equal(parsed.user, null);
        assert.equal(parsed.public, false);
      });

      it('keeps an admin key integration private', function () {
        const parsed = parseContext({
          api_key: adminKey,
          principal: { kind: 'integration', method: 'admin_api_key' },
        });

        assert.equal(parsed.principal?.kind, 'integration');
        assert.equal(parsed.public, false);
      });

      it('never treats an integration with no key as public', function () {
        const parsed = parseContext({
          principal: { kind: 'integration', method: 'admin_api_key' },
        });

        assert.equal(parsed.public, false);
      });

      it('keeps a content key public', function () {
        const principal = { kind: 'integration', method: 'content_api_key' };
        const parsed = parseContext({ api_key: contentKey, principal });

        assert.equal(parsed.principal, principal);
        assert.equal(parsed.public, true);
      });

      it('keeps an anonymous principal public', function () {
        const parsed = parseContext({ principal: { kind: 'anonymous' } });

        assert.deepEqual(parsed.principal, { kind: 'anonymous' });
        assert.equal(parsed.public, true);
      });

      it('never treats an internal principal as public', function () {
        const parsed = parseContext({ principal: { kind: 'internal' } });

        assert.equal(parsed.public, false);
      });

      it('decides public from the principal, not a content key beside it', function () {
        const parsed = parseContext({
          api_key: contentKey,
          principal: { kind: 'user', method: 'staff_token', user },
        });

        assert.equal(parsed.public, false);
      });

      it('gives the same result when parsed twice, as canThis does', function () {
        const once = parseContext({
          api_key: contentKey,
          principal: { kind: 'integration', method: 'content_api_key', scopes: ['post:read'] },
        });

        assert.deepEqual(parseContext(once), once);
      });
    });
  });
});
