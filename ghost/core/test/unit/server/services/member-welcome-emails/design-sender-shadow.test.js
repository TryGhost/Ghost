const assert = require('node:assert/strict');
const designSenderShadow = require('../../../../../core/server/services/member-welcome-emails/design-sender-shadow');

describe('Member welcome emails: design-sender-shadow', function () {
    let originalEnv;

    beforeEach(function () {
        originalEnv = process.env.NODE_ENV;
    });

    afterEach(function () {
        process.env.NODE_ENV = originalEnv;
    });

    describe('outside development (production)', function () {
        beforeEach(function () {
            process.env.NODE_ENV = 'production';
        });

        it('is disabled, so get returns null and set is a no-op', function () {
            assert.equal(designSenderShadow.isEnabled(), false);
            designSenderShadow.set('design-prod-1', {sender_name: 'Nope'});
            assert.equal(designSenderShadow.get('design-prod-1'), null);
        });
    });

    describe('in development', function () {
        beforeEach(function () {
            process.env.NODE_ENV = 'development';
        });

        it('round-trips set/get and merges fields without clobbering others', function () {
            designSenderShadow.set('design-dev-1', {sender_name: 'Jamie'});
            assert.deepEqual(designSenderShadow.get('design-dev-1'), {
                sender_name: 'Jamie',
                sender_email: null,
                sender_reply_to: null
            });

            designSenderShadow.set('design-dev-1', {sender_reply_to: 'reply@example.com'});
            assert.deepEqual(designSenderShadow.get('design-dev-1'), {
                sender_name: 'Jamie',
                sender_email: null,
                sender_reply_to: 'reply@example.com'
            });
        });

        it('seedFrom seeds once and never clobbers later edits', function () {
            designSenderShadow.seedFrom('design-dev-2', {sender_name: 'Seed', sender_email: null, sender_reply_to: null});
            designSenderShadow.set('design-dev-2', {sender_name: 'Edited'});

            // A later reload re-seeds; it must be a no-op (the edit wins).
            designSenderShadow.seedFrom('design-dev-2', {sender_name: 'Seed again'});

            assert.equal(designSenderShadow.get('design-dev-2').sender_name, 'Edited');
        });

        it('ignores empty/missing design ids', function () {
            designSenderShadow.set('', {sender_name: 'X'});
            assert.equal(designSenderShadow.get(''), null);
            assert.equal(designSenderShadow.get(null), null);
            assert.equal(designSenderShadow.get(undefined), null);
        });
    });
});
