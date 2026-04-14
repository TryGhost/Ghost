const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, dbUtils} = require('../../utils/e2e-framework');

describe('Drip Sequences API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        await dbUtils.truncate('welcome_email_automated_emails');
        await dbUtils.truncate('welcome_email_automations');
    });

    async function readBySlug(slug) {
        const {body} = await agent
            .get(`drip_sequences/${slug}/`)
            .expectStatus(200);

        return body.drip_sequences[0];
    }

    it('can read an empty sequence for an allowed slug', async function () {
        const sequence = await readBySlug('member-welcome-email-free');

        assert.equal(sequence.automation_slug, 'member-welcome-email-free');
        assert.equal(sequence.automation_id, null);
        assert.deepEqual(sequence.emails, []);
    });

    it('can save and read a multi-step drip sequence in order', async function () {
        const payload = {
            drip_sequences: [{
                emails: [
                    {
                        subject: 'Step 1',
                        lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                        delay_days: 0
                    },
                    {
                        subject: 'Step 2',
                        lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                        delay_days: 3
                    },
                    {
                        subject: 'Step 3',
                        lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                        delay_days: 7
                    }
                ]
            }]
        };

        const {body} = await agent
            .put('drip_sequences/member-welcome-email-free/')
            .body(payload)
            .expectStatus(200);

        const sequence = body.drip_sequences[0];

        assert.equal(sequence.automation_slug, 'member-welcome-email-free');
        assert.equal(sequence.emails.length, 3);
        assert.deepEqual(sequence.emails.map(email => email.subject), ['Step 1', 'Step 2', 'Step 3']);
        assert.equal(sequence.emails[0].next_welcome_email_automated_email_id, sequence.emails[1].id);
        assert.equal(sequence.emails[1].next_welcome_email_automated_email_id, sequence.emails[2].id);
        assert.equal(sequence.emails[2].next_welcome_email_automated_email_id, null);

        const readSequence = await readBySlug('member-welcome-email-free');
        assert.deepEqual(readSequence.emails.map(email => email.id), sequence.emails.map(email => email.id));
    });

    it('replaces sequence rows and removes missing emails', async function () {
        const initialResponse = await agent
            .put('drip_sequences/member-welcome-email-paid/')
            .body({
                drip_sequences: [{
                    emails: [
                        {
                            subject: 'Paid 1',
                            lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                            delay_days: 0
                        },
                        {
                            subject: 'Paid 2',
                            lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                            delay_days: 2
                        }
                    ]
                }]
            })
            .expectStatus(200);

        const [firstEmail, secondEmail] = initialResponse.body.drip_sequences[0].emails;

        await agent
            .put('drip_sequences/member-welcome-email-paid/')
            .body({
                drip_sequences: [{
                    emails: [
                        {
                            id: firstEmail.id,
                            subject: 'Paid 1 updated',
                            lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                            delay_days: 1
                        },
                        {
                            subject: 'Paid 3 new',
                            lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: []}]}}),
                            delay_days: 4
                        }
                    ]
                }]
            })
            .expectStatus(200);

        const automationRows = await dbUtils.knex('welcome_email_automations')
            .where('slug', 'member-welcome-email-paid');
        const automationId = automationRows[0].id;

        const emailRows = await dbUtils.knex('welcome_email_automated_emails')
            .where('welcome_email_automation_id', automationId);
        const emailIds = emailRows.map(email => email.id);

        assert.equal(emailRows.length, 2);
        assert(emailIds.includes(firstEmail.id));
        assert(!emailIds.includes(secondEmail.id));
    });

    it('validates invalid automation slug', async function () {
        await agent
            .get('drip_sequences/not-a-valid-slug/')
            .expectStatus(422);

        await agent
            .put('drip_sequences/not-a-valid-slug/')
            .body({
                drip_sequences: [{
                    emails: [{
                        subject: 'Invalid',
                        lexical: JSON.stringify({root: {children: []}}),
                        delay_days: 0
                    }]
                }]
            })
            .expectStatus(422);
    });
});
