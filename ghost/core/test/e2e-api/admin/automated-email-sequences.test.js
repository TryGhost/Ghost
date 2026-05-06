const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyErrorId, anyEtag} = matchers;
const assert = require('node:assert/strict');
const models = require('../../../core/server/models');

describe('Automated Email Sequences API', function () {
    let agent;

    const createAutomation = async (overrides = {}) => {
        const automation = await models.WelcomeEmailAutomation.add({
            name: 'Welcome Email (Free)',
            slug: 'member-welcome-email-free',
            status: 'active',
            ...overrides
        });
        return automation;
    };

    const createEmail = async (automationId, overrides = {}) => {
        const email = await models.WelcomeEmailAutomatedEmail.add({
            welcome_email_automation_id: automationId,
            delay_days: 0,
            subject: 'Welcome!',
            lexical: JSON.stringify({root: {children: []}}),
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            next_welcome_email_automated_email_id: null,
            ...overrides
        });
        return email;
    };

    const validEmailPayload = (overrides = {}) => ({
        delay_days: 0,
        subject: 'Welcome!',
        lexical: JSON.stringify({root: {children: []}}),
        sender_name: 'Ghost',
        sender_email: 'ghost@example.com',
        sender_reply_to: 'ghost@example.com',
        email_design_setting_id: undefined, // set per-test
        ...overrides
    });

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        await dbUtils.truncate('welcome_email_automation_runs');
        await dbUtils.truncate('welcome_email_automated_emails');
        await dbUtils.truncate('welcome_email_automations');
    });

    describe('Read', function () {
        it('Can read the sequence for an automation', async function () {
            const automation = await createAutomation();
            const email1 = await createEmail(automation.id, {delay_days: 0, subject: 'First'});
            const email2 = await createEmail(automation.id, {delay_days: 3, subject: 'Second'});

            // Link them: email1 -> email2
            await models.WelcomeEmailAutomatedEmail.edit(
                {next_welcome_email_automated_email_id: email2.id},
                {id: email1.id}
            );

            const {body} = await agent
                .get(`automated_emails/${automation.id}/sequence`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const seq = body.automated_email_sequences;
            assert.equal(seq.id, automation.id);
            assert.equal(seq.emails.length, 2);
            assert.equal(seq.emails[0].id, email1.id);
            assert.equal(seq.emails[0].subject, 'First');
            assert.equal(seq.emails[0].delay_days, 0);
            assert.equal(seq.emails[1].id, email2.id);
            assert.equal(seq.emails[1].subject, 'Second');
            assert.equal(seq.emails[1].delay_days, 3);
        });

        it('Returns empty emails array for automation with no emails', async function () {
            const automation = await createAutomation();

            const {body} = await agent
                .get(`automated_emails/${automation.id}/sequence`)
                .expectStatus(200);

            assert.equal(body.automated_email_sequences.emails.length, 0);
        });

        it('Returns 404 for non-existent automation', async function () {
            await agent
                .get('automated_emails/aaaaaaaaaaaaaaaaaaaaaaaa/sequence')
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{id: anyErrorId}]
                });
        });
    });

    describe('Edit', function () {
        let defaultDesignSettingId;

        before(async function () {
            let designSetting = await models.EmailDesignSetting.findOne({slug: 'default-automated-email'});
            if (!designSetting) {
                designSetting = await models.EmailDesignSetting.add({slug: 'default-automated-email'});
            }
            defaultDesignSettingId = designSetting.id;
        });

        it('Can create a sequence from scratch', async function () {
            const automation = await createAutomation();

            const {body} = await agent
                .put(`automated_emails/${automation.id}/sequence`)
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({delay_days: 0, subject: 'Welcome', email_design_setting_id: defaultDesignSettingId}),
                        validEmailPayload({delay_days: 3, subject: 'Follow-up', email_design_setting_id: defaultDesignSettingId})
                    ]
                }})
                .expectStatus(200);

            const seq = body.automated_email_sequences;
            assert.equal(seq.emails.length, 2);
            assert.equal(seq.emails[0].subject, 'Welcome');
            assert.equal(seq.emails[0].delay_days, 0);
            assert.equal(seq.emails[1].subject, 'Follow-up');
            assert.equal(seq.emails[1].delay_days, 3);

            // Verify linked list in DB
            const dbEmail1 = await models.WelcomeEmailAutomatedEmail.findOne({id: seq.emails[0].id});
            assert.equal(dbEmail1.get('next_welcome_email_automated_email_id'), seq.emails[1].id);

            const dbEmail2 = await models.WelcomeEmailAutomatedEmail.findOne({id: seq.emails[1].id});
            assert.equal(dbEmail2.get('next_welcome_email_automated_email_id'), null);
        });

        it('Can update existing emails in a sequence', async function () {
            const automation = await createAutomation();
            const email = await createEmail(automation.id, {
                delay_days: 0,
                subject: 'Old Subject',
                email_design_setting_id: defaultDesignSettingId
            });

            const {body} = await agent
                .put(`automated_emails/${automation.id}/sequence`)
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({
                            id: email.id,
                            delay_days: 1,
                            subject: 'New Subject',
                            email_design_setting_id: defaultDesignSettingId
                        })
                    ]
                }})
                .expectStatus(200);

            const seq = body.automated_email_sequences;
            assert.equal(seq.emails.length, 1);
            assert.equal(seq.emails[0].id, email.id);
            assert.equal(seq.emails[0].subject, 'New Subject');
            assert.equal(seq.emails[0].delay_days, 1);
        });

        it('Can add new emails to an existing sequence', async function () {
            const automation = await createAutomation();
            const existing = await createEmail(automation.id, {
                delay_days: 0,
                subject: 'First',
                email_design_setting_id: defaultDesignSettingId
            });

            const {body} = await agent
                .put(`automated_emails/${automation.id}/sequence`)
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({
                            id: existing.id,
                            delay_days: 0,
                            subject: 'First',
                            email_design_setting_id: defaultDesignSettingId
                        }),
                        validEmailPayload({
                            delay_days: 2,
                            subject: 'New Second',
                            email_design_setting_id: defaultDesignSettingId
                        })
                    ]
                }})
                .expectStatus(200);

            const seq = body.automated_email_sequences;
            assert.equal(seq.emails.length, 2);
            assert.equal(seq.emails[0].id, existing.id);
            assert.ok(seq.emails[1].id);
            assert.equal(seq.emails[1].subject, 'New Second');
        });

        it('Deletes emails not in the request', async function () {
            const automation = await createAutomation();
            const email1 = await createEmail(automation.id, {
                delay_days: 0,
                subject: 'Keep',
                email_design_setting_id: defaultDesignSettingId
            });
            const email2 = await createEmail(automation.id, {
                delay_days: 1,
                subject: 'Delete Me',
                email_design_setting_id: defaultDesignSettingId
            });
            await models.WelcomeEmailAutomatedEmail.edit(
                {next_welcome_email_automated_email_id: email2.id},
                {id: email1.id}
            );

            const {body} = await agent
                .put(`automated_emails/${automation.id}/sequence`)
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({
                            id: email1.id,
                            delay_days: 0,
                            subject: 'Keep',
                            email_design_setting_id: defaultDesignSettingId
                        })
                    ]
                }})
                .expectStatus(200);

            const seq = body.automated_email_sequences;
            assert.equal(seq.emails.length, 1);
            assert.equal(seq.emails[0].id, email1.id);

            const deleted = await models.WelcomeEmailAutomatedEmail.findOne({id: email2.id});
            assert.equal(deleted, null);
        });

        it('Rejects email IDs not belonging to the automation', async function () {
            const automation1 = await createAutomation({
                name: 'Welcome Email (Free)',
                slug: 'member-welcome-email-free'
            });
            const automation2 = await createAutomation({
                name: 'Welcome Email (Paid)',
                slug: 'member-welcome-email-paid'
            });
            const emailFromOther = await createEmail(automation2.id, {
                email_design_setting_id: defaultDesignSettingId
            });

            await agent
                .put(`automated_emails/${automation1.id}/sequence`)
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({
                            id: emailFromOther.id,
                            email_design_setting_id: defaultDesignSettingId
                        })
                    ]
                }})
                .expectStatus(422);
        });

        it('Returns 404 for non-existent automation', async function () {
            await agent
                .put('automated_emails/aaaaaaaaaaaaaaaaaaaaaaaa/sequence')
                .body({automated_email_sequences: {
                    emails: [
                        validEmailPayload({email_design_setting_id: 'bbbbbbbbbbbbbbbbbbbbbbbb'})
                    ]
                }})
                .expectStatus(404);
        });

        describe('Run Reconciliation', function () {
            it('Remaps runs from deleted email to next surviving email', async function () {
                const automation = await createAutomation();
                const email1 = await createEmail(automation.id, {
                    delay_days: 0,
                    subject: 'First',
                    email_design_setting_id: defaultDesignSettingId
                });
                const email2 = await createEmail(automation.id, {
                    delay_days: 1,
                    subject: 'Second',
                    email_design_setting_id: defaultDesignSettingId
                });
                const email3 = await createEmail(automation.id, {
                    delay_days: 3,
                    subject: 'Third',
                    email_design_setting_id: defaultDesignSettingId
                });
                // Link: email1 -> email2 -> email3
                await models.WelcomeEmailAutomatedEmail.edit(
                    {next_welcome_email_automated_email_id: email2.id},
                    {id: email1.id}
                );
                await models.WelcomeEmailAutomatedEmail.edit(
                    {next_welcome_email_automated_email_id: email3.id},
                    {id: email2.id}
                );

                const member = await models.Member.add({
                    email: 'test-reconcile@example.com',
                    name: 'Test',
                    status: 'free',
                    email_disabled: false
                });

                // Run pointing to email2 (about to be deleted)
                await models.WelcomeEmailAutomationRun.add({
                    welcome_email_automation_id: automation.id,
                    member_id: member.id,
                    next_welcome_email_automated_email_id: email2.id,
                    ready_at: new Date(),
                    step_started_at: null,
                    step_attempts: 0,
                    exit_reason: null
                });

                // Delete email2, keep email1 and email3
                await agent
                    .put(`automated_emails/${automation.id}/sequence`)
                    .body({automated_email_sequences: {
                        emails: [
                            validEmailPayload({
                                id: email1.id,
                                delay_days: 0,
                                subject: 'First',
                                email_design_setting_id: defaultDesignSettingId
                            }),
                            validEmailPayload({
                                id: email3.id,
                                delay_days: 3,
                                subject: 'Third',
                                email_design_setting_id: defaultDesignSettingId
                            })
                        ]
                    }})
                    .expectStatus(200);

                const runs = await models.WelcomeEmailAutomationRun.findAll({
                    filter: `member_id:${member.id}`
                });
                assert.equal(runs.models.length, 1);
                assert.equal(runs.models[0].get('next_welcome_email_automated_email_id'), email3.id);
                assert.equal(runs.models[0].get('exit_reason'), null);
            });

            it('Marks runs as finished when deleted email has no replacement', async function () {
                const automation = await createAutomation();
                const email1 = await createEmail(automation.id, {
                    delay_days: 0,
                    subject: 'First',
                    email_design_setting_id: defaultDesignSettingId
                });
                const email2 = await createEmail(automation.id, {
                    delay_days: 1,
                    subject: 'Last',
                    email_design_setting_id: defaultDesignSettingId
                });
                await models.WelcomeEmailAutomatedEmail.edit(
                    {next_welcome_email_automated_email_id: email2.id},
                    {id: email1.id}
                );

                const member = await models.Member.add({
                    email: 'test-finish@example.com',
                    name: 'Test',
                    status: 'free',
                    email_disabled: false
                });

                await models.WelcomeEmailAutomationRun.add({
                    welcome_email_automation_id: automation.id,
                    member_id: member.id,
                    next_welcome_email_automated_email_id: email2.id,
                    ready_at: new Date(),
                    step_started_at: null,
                    step_attempts: 0,
                    exit_reason: null
                });

                // Keep only email1
                await agent
                    .put(`automated_emails/${automation.id}/sequence`)
                    .body({automated_email_sequences: {
                        emails: [
                            validEmailPayload({
                                id: email1.id,
                                delay_days: 0,
                                subject: 'First',
                                email_design_setting_id: defaultDesignSettingId
                            })
                        ]
                    }})
                    .expectStatus(200);

                const runs = await models.WelcomeEmailAutomationRun.findAll({
                    filter: `member_id:${member.id}`
                });
                assert.equal(runs.models[0].get('next_welcome_email_automated_email_id'), null);
                assert.equal(runs.models[0].get('exit_reason'), 'finished');
            });

            it('Does not modify locked (in-progress) runs when delay_days changes', async function () {
                const automation = await createAutomation();
                const email = await createEmail(automation.id, {
                    delay_days: 1,
                    subject: 'Test',
                    email_design_setting_id: defaultDesignSettingId
                });

                const member = await models.Member.add({
                    email: 'test-locked@example.com',
                    name: 'Test',
                    status: 'free',
                    email_disabled: false
                });

                const originalReadyAt = new Date('2026-04-02T00:00:00Z');
                const lockedAt = new Date();
                await models.WelcomeEmailAutomationRun.add({
                    welcome_email_automation_id: automation.id,
                    member_id: member.id,
                    next_welcome_email_automated_email_id: email.id,
                    ready_at: originalReadyAt,
                    step_started_at: lockedAt,
                    step_attempts: 1,
                    exit_reason: null
                });

                // Change delay from 1 to 5
                await agent
                    .put(`automated_emails/${automation.id}/sequence`)
                    .body({automated_email_sequences: {
                        emails: [
                            validEmailPayload({
                                id: email.id,
                                delay_days: 5,
                                subject: 'Test',
                                email_design_setting_id: defaultDesignSettingId
                            })
                        ]
                    }})
                    .expectStatus(200);

                const runs = await models.WelcomeEmailAutomationRun.findAll({
                    filter: `member_id:${member.id}`
                });
                const run = runs.models[0];
                // ready_at should NOT have changed because the run was locked
                const readyAt = new Date(run.get('ready_at'));
                assert.equal(readyAt.toISOString().slice(0, 10), originalReadyAt.toISOString().slice(0, 10));
            });
        });
    });
});
