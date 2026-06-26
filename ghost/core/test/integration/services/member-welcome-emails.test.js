const assert = require('node:assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const {mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const mailService = require('../../../core/server/services/mail');
const settingsHelpers = require('../../../core/server/services/settings-helpers');
const {MEMBER_WELCOME_EMAIL_SLUGS, MESSAGES} = require('../../../core/server/services/member-welcome-emails/constants');
const memberWelcomeEmailService = require('../../../core/server/services/member-welcome-emails/service');

function parseDatabaseDate(date) {
    if (date instanceof Date) {
        return date;
    }

    if (typeof date === 'string') {
        return new Date(date.replace(' ', 'T') + 'Z');
    }

    return new Date(date);
}

describe('Member Welcome Emails Integration', function () {
    let membersService;
    let defaultNewsletterSenderState = null;
    let defaultEmailDesignSettingId;

    beforeAll(async function () {
        await testUtils.setup('default')();
        membersService = require('../../../core/server/services/members');
        membersService.init();
        defaultEmailDesignSettingId = await db.knex('email_design_settings')
            .where('slug', 'default-automated-email')
            .first('id')
            .then(row => row.id);
    });

    beforeEach(async function () {
        mockManager.mockLabsDisabled('automations');

        const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
        if (defaultNewsletter) {
            defaultNewsletterSenderState = {
                id: defaultNewsletter.id,
                sender_name: defaultNewsletter.get('sender_name'),
                sender_email: defaultNewsletter.get('sender_email'),
                sender_reply_to: defaultNewsletter.get('sender_reply_to')
            };
        } else {
            defaultNewsletterSenderState = null;
        }

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

        const freeAutomationId = ObjectId().toHexString();
        await db.knex('automations').insert({
            id: freeAutomationId,
            status: 'active',
            name: 'Free Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
            created_at: new Date()
        });
        await db.knex('welcome_email_automated_emails').insert({
            id: ObjectId().toHexString(),
            welcome_email_automation_id: freeAutomationId,
            delay_days: 0,
            subject: 'Welcome to {site_title}',
            lexical,
            email_design_setting_id: defaultEmailDesignSettingId,
            created_at: new Date()
        });

        const paidAutomationId = ObjectId().toHexString();
        await db.knex('automations').insert({
            id: paidAutomationId,
            status: 'active',
            name: 'Paid Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
            created_at: new Date()
        });
        await db.knex('welcome_email_automated_emails').insert({
            id: ObjectId().toHexString(),
            welcome_email_automation_id: paidAutomationId,
            delay_days: 0,
            subject: 'Welcome paid member to {site_title}',
            lexical,
            email_design_setting_id: defaultEmailDesignSettingId,
            created_at: new Date()
        });
    });

    afterEach(async function () {
        mockManager.restore();
        sinon.restore();

        if (defaultNewsletterSenderState) {
            await db.knex('newsletters')
                .where('id', defaultNewsletterSenderState.id)
                .update({
                    sender_name: defaultNewsletterSenderState.sender_name,
                    sender_email: defaultNewsletterSenderState.sender_email,
                    sender_reply_to: defaultNewsletterSenderState.sender_reply_to
                });
        }

        await db.knex('automated_email_recipients').del();
        await db.knex('members').del();
        await db.knex('email_design_settings')
            .where('id', defaultEmailDesignSettingId)
            .update({
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
        await db.knex('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        await db.knex('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();
    });

    describe('Member creation with welcome emails', function () {
        afterEach(async function () {
            await db.knex('welcome_email_automation_runs').del();
        });

        it('creates legacy automation run when automations labs flag is disabled', async function () {
            await db.knex.transaction(async (trx) => {
                const before = new Date(Date.now() - 1000);

                const member = await membersService.api.members.create({
                    email: 'welcome-test@example.com',
                    name: 'Welcome Test Member'
                }, {transacting: trx});

                const after = new Date(Date.now() + 1000);

                const runs = await trx('welcome_email_automation_runs')
                    .where('member_id', member.id);

                assert.equal(runs.length, 1);
                const run = runs[0];
                assert.equal(run.member_id, member.id);
                assert.ok(run.welcome_email_automation_id);
                assert.ok(run.next_welcome_email_automated_email_id);
                assert.equal(run.step_started_at, null);
                assert.equal(run.step_attempts, 0);
                assert.equal(run.exit_reason, null);

                const timestamp = parseDatabaseDate(run.ready_at);
                assert(timestamp >= before);
                assert(timestamp <= after);
            });
        });

        it('does NOT create automation run when member is imported', async function () {
            await membersService.api.members.create({
                email: 'imported@example.com',
                name: 'Imported Member'
            }, {context: {import: true}});

            const runs = await db.knex('welcome_email_automation_runs');
            assert.equal(runs.length, 0);
        });

        it('does NOT create automation run when member is created by admin', async function () {
            await membersService.api.members.create({
                email: 'admin-created@example.com',
                name: 'Admin Created Member'
            }, {context: {user: true}});

            const runs = await db.knex('welcome_email_automation_runs');
            assert.equal(runs.length, 0);
        });
    });

    describe('Sending welcome emails', function () {
        beforeEach(function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
        });

        afterEach(function () {
            sinon.restore();
        });

        async function sendMemberWelcomeEmail({
            member = {
                email: 'member@example.com',
                name: 'Member',
                uuid: '11111111-1111-4111-8111-111111111111'
            },
            memberStatus = 'free'
        } = {}) {
            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();
            await memberWelcomeEmailService.api.loadMemberWelcomeEmails();
            await memberWelcomeEmailService.api.send({
                member,
                memberStatus
            });
        }

        async function sendAutomationEmail() {
            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();

            await memberWelcomeEmailService.api.sendAutomationEmail({
                email: {
                    designSettingId: defaultEmailDesignSettingId,
                    lexical: JSON.stringify({
                        root: {
                            children: [{
                                type: 'paragraph',
                                children: [{type: 'text', text: 'Hello'}]
                            }],
                            direction: null,
                            format: '',
                            indent: 0,
                            type: 'root',
                            version: 1
                        }
                    }),
                    subject: 'Automation email'
                },
                member: {
                    email: 'automation-member@example.com',
                    name: 'Automation Member',
                    uuid: '99999999-9999-4999-8999-999999999999'
                },
                memberStatus: 'free'
            });
        }

        it('does not send email when template is inactive', async function () {
            await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .update({status: 'inactive'});

            await assert.rejects(async () => {
                await sendMemberWelcomeEmail({
                    member: {
                        uuid: '11111111-1111-4111-8111-111111111111',
                        email: 'inactive@example.com',
                        name: 'Inactive Template Member'
                    }
                });
            }, {
                message: MESSAGES.memberWelcomeEmailInactive('free')
            });

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);
        });

        it('does not send email when no template exists', async function () {
            await db.knex('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();

            await assert.rejects(async () => {
                await sendMemberWelcomeEmail({
                    member: {
                        uuid: '22222222-2222-4222-8222-222222222222',
                        email: 'notemplate@example.com',
                        name: 'No Template Member'
                    }
                });
            }, {
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);
        });

        it('does not send email when paid template is inactive', async function () {
            await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid)
                .update({status: 'inactive'});

            await assert.rejects(async () => {
                await sendMemberWelcomeEmail({
                    member: {
                        uuid: '33333333-3333-4333-8333-333333333333',
                        email: 'paid-inactive@example.com',
                        name: 'Paid Inactive Template Member'
                    },
                    memberStatus: 'paid'
                });
            }, {
                message: MESSAGES.memberWelcomeEmailInactive('paid')
            });

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);
        });

        it('does not send email when no paid template exists', async function () {
            await db.knex('automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();

            await assert.rejects(async () => {
                await sendMemberWelcomeEmail({
                    member: {
                        uuid: '44444444-4444-4444-8444-444444444444',
                        email: 'paid-notemplate@example.com',
                        name: 'Paid No Template Member'
                    },
                    memberStatus: 'paid'
                });
            }, {
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);
        });

        it('sends email to member email', async function () {
            const memberEmail = 'real-member@example.com';

            await sendMemberWelcomeEmail({
                member: {
                    uuid: '55555555-5555-4555-8555-555555555555',
                    email: memberEmail,
                    name: 'Real Member'
                }
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].to, memberEmail);
            assert.deepEqual(sendCall.args[0].tags, ['member-welcome-email']);
        });

        it('uses configured sender and reply-to when sending member welcome email', async function () {
            const senderEmail = 'editor@example.com';
            const senderReplyTo = 'reply@example.com';
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Scott',
                    sender_email: senderEmail,
                    sender_reply_to: senderReplyTo
                });

            await sendMemberWelcomeEmail({
                member: {
                    uuid: '66666666-6666-4666-8666-666666666666',
                    email: 'sender-test@example.com',
                    name: 'Sender Test'
                }
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].replyTo, senderReplyTo);
            assert.ok(sendCall.args[0].from.includes(senderEmail));
        });

        it('prefers sender details from email design settings for member welcome emails', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Ignored Newsletter Sender',
                    sender_email: 'ignored-newsletter@example.com',
                    sender_reply_to: 'ignored-newsletter-reply@example.com'
                });

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                });

            const welcomeEmailAutomation = await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first('id');

            await db.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', welcomeEmailAutomation.id)
                .update({
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                });

            await sendMemberWelcomeEmail({
                member: {
                    uuid: '88888888-8888-4888-8888-888888888888',
                    email: 'automation-sender-test@example.com',
                    name: 'Automation Sender Test'
                }
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].from, '"Design Sender" <design@example.com>');
            assert.equal(sendCall.args[0].replyTo, 'design-reply@example.com');
        });

        it('uses newsletter sender details for member welcome emails when email design sender details are empty', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'newsletter-reply@example.com'
                });

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                });

            const welcomeEmailAutomation = await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first('id');

            await db.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', welcomeEmailAutomation.id)
                .update({
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                });

            await sendMemberWelcomeEmail({
                member: {
                    uuid: '77777777-7777-4777-8777-777777777777',
                    email: 'legacy-design-sender-test@example.com',
                    name: 'Legacy Design Sender Test'
                }
            });

            sinon.assert.calledOnceWithExactly(mailService.GhostMailer.prototype.send, sinon.match({
                from: '"Newsletter Sender" <newsletter@example.com>',
                replyTo: 'newsletter-reply@example.com'
            }));
        });

        it('uses newsletter sender details for automation emails', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'newsletter-reply@example.com'
                });

            await sendAutomationEmail();

            sinon.assert.calledOnceWithExactly(mailService.GhostMailer.prototype.send, sinon.match({
                from: '"Newsletter Sender" <newsletter@example.com>',
                replyTo: 'newsletter-reply@example.com'
            }));
        });

        it('uses email design sender details for automation emails', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Ignored Newsletter Sender',
                    sender_email: 'ignored@example.com',
                    sender_reply_to: 'ignored-reply@example.com'
                });

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                });

            await sendAutomationEmail();

            sinon.assert.calledOnceWithExactly(mailService.GhostMailer.prototype.send, sinon.match({
                from: '"Design Sender" <design@example.com>',
                replyTo: 'design-reply@example.com'
            }));
        });

        it('falls back to site sender defaults for automation emails when newsletter sender fields are missing', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: 'newsletter'
                });

            await sendAutomationEmail();

            sinon.assert.calledOnceWithExactly(mailService.GhostMailer.prototype.send, sinon.match({
                from: settingsHelpers.getDefaultEmail().address,
                replyTo: undefined
            }));
        });

        it('falls back to site sender defaults for automation emails when no default newsletter exists', async function () {
            sinon.stub(models.Newsletter, 'getDefaultNewsletter').resolves(null);

            await sendAutomationEmail();

            sinon.assert.calledOnceWithExactly(mailService.GhostMailer.prototype.send, sinon.match({
                from: settingsHelpers.getDefaultEmail().address,
                replyTo: undefined
            }));
        });

        it('adds an updates & announcements unsubscribe link and one-click headers when automations is enabled', async function () {
            mockManager.mockLabsEnabled('automations');

            await sendAutomationEmail();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            const message = sendCall.args[0];

            assert.match(message.html, /\/unsubscribe\/\?uuid=99999999-9999-4999-8999-999999999999&amp;key=[a-f0-9]+&amp;updatesandannouncements=1/);
            assert.match(message.headers['List-Unsubscribe'], /^<http.*\/unsubscribe\/\?uuid=99999999-9999-4999-8999-999999999999&key=[a-f0-9]+&updatesandannouncements=1>$/);
            assert.equal(message.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
        });

        it('does not add an unsubscribe link or one-click headers when automations is disabled', async function () {
            await sendAutomationEmail();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const message = mailService.GhostMailer.prototype.send.firstCall.args[0];

            assert.doesNotMatch(message.html, /updatesandannouncements=1/);
            assert.equal(message.headers, undefined);
        });

        it('uses mock member UUID when sending test welcome emails', async function () {
            const automation = await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();

            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'paragraph',
                        children: [{type: 'text', text: 'Your feed token is {uuid}'}]
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();

            await memberWelcomeEmailService.api.sendTestEmail({
                email: 'test-member@example.com',
                subject: 'Welcome test',
                lexical,
                automatedEmailId: automation.id
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.ok(sendCall.args[0].html.includes('00000000-0000-4000-8000-000000000000'));
            assert(!sendCall.args[0].html.includes('{uuid}'));
            assert(!sendCall.args[0].html.includes('%7Buuid%7D'));
        });

        it('uses email design sender details for test welcome emails', async function () {
            memberWelcomeEmailService.init();

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                });

            const automation = await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();

            await db.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automation.id)
                .update({
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                });

            await memberWelcomeEmailService.api.sendTestEmail({
                email: 'test-member@example.com',
                subject: 'Welcome test',
                lexical: JSON.stringify({
                    root: {
                        children: [{
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Hello'}]
                        }],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'root',
                        version: 1
                    }
                }),
                automatedEmailId: automation.id
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].from, '"Design Sender" <design@example.com>');
            assert.equal(sendCall.args[0].replyTo, 'design-reply@example.com');
        });

        it('uses newsletter sender details for test welcome emails when email design sender details are empty', async function () {
            memberWelcomeEmailService.init();

            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'newsletter-reply@example.com'
                });

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                });

            const automation = await db.knex('automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();

            await db.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automation.id)
                .update({
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                });

            await memberWelcomeEmailService.api.sendTestEmail({
                email: 'test-member@example.com',
                subject: 'Welcome test',
                lexical: JSON.stringify({
                    root: {
                        children: [{
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Hello'}]
                        }],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'root',
                        version: 1
                    }
                }),
                automatedEmailId: automation.id
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].from, '"Newsletter Sender" <newsletter@example.com>');
            assert.equal(sendCall.args[0].replyTo, 'newsletter-reply@example.com');
        });
    });

    describe('design settings', function () {
        beforeEach(function () {
            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
        });

        it('uses cached design settings after welcome emails are loaded', async function () {
            await memberWelcomeEmailService.api.loadMemberWelcomeEmails();

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    footer_content: '<p>Fresh footer content</p>',
                    show_badge: false
                });

            await memberWelcomeEmailService.api.send({
                member: {
                    email: 'fresh-design@example.com',
                    name: 'Fresh Design',
                    uuid: '77777777-7777-4777-8777-777777777777'
                },
                memberStatus: 'free'
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].html.includes('Fresh footer content</p>'), false);
            assert.equal(sendCall.args[0].html.includes('https://ghost.org/?via=pbg-newsletter'), true);
        });
    });
});
