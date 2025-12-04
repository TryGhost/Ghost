const assert = require('assert/strict');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const configUtils = require('../../utils/configUtils');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');

describe('Member Welcome Emails Integration', function () {
    let membersService;

    before(async function () {
        await testUtils.setup('default')();
        membersService = require('../../../core/server/services/members');
    });

    beforeEach(async function () {
        await db.knex('outbox').del();
        await db.knex('members').del();

        const lexical = JSON.stringify({
            root: {
                children: [{
                    type: 'paragraph',
                    children: [{type: 'text', text: 'Welcome to our site!'}]
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });

        await db.knex('automated_emails').insert({
            id: ObjectId().toHexString(),
            status: 'active',
            name: 'Free Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
            subject: 'Welcome to {{site.title}}',
            lexical,
            created_at: new Date()
        });
    });

    afterEach(async function () {
        await db.knex('outbox').del();
        await db.knex('members').del();
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        await configUtils.restore();
    });

    describe('Member creation with welcome emails enabled', function () {
        it('creates outbox entry when member source is "member"', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

            const member = await membersService.api.members.create({
                email: 'welcome-test@example.com',
                name: 'Welcome Test Member'
            }, {});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            assert.equal(entry.get('event_type'), 'MemberCreatedEvent');
            assert.equal(entry.get('status'), OUTBOX_STATUSES.PENDING);
            
            const payload = JSON.parse(entry.get('payload'));
            assert.equal(payload.memberId, member.id);
            assert.equal(payload.email, 'welcome-test@example.com');
            assert.equal(payload.name, 'Welcome Test Member');
            assert.equal(payload.source, 'member');
        });

        it('does NOT create outbox entry when config is not set', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', '');
            
            await membersService.api.members.create({
                email: 'no-welcome@example.com',
                name: 'No Welcome Member'
            }, {});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is imported', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

            await membersService.api.members.create({
                email: 'imported@example.com',
                name: 'Imported Member'
            }, {context: {import: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is created by admin', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

            await membersService.api.members.create({
                email: 'admin-created@example.com',
                name: 'Admin Created Member'
            }, {context: {user: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('creates outbox entry with correct timestamp', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

            const beforeCreation = new Date(Date.now() - 1000);
            
            await membersService.api.members.create({
                email: 'timestamp-test@example.com',
                name: 'Timestamp Test'
            }, {});

            const afterCreation = new Date(Date.now() + 1000);

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            const payload = JSON.parse(entry.get('payload'));
            
            const timestamp = new Date(payload.timestamp);
            assert.ok(timestamp >= beforeCreation);
            assert.ok(timestamp <= afterCreation);
        });
    });
});

