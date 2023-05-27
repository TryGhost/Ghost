const EmailService = require('../lib/EmailService');
const assert = require('assert');
const sinon = require('sinon');
const {createModel, createModelClass} = require('./utils');

describe('Email Service', function () {
    let memberCount, limited, verificicationRequired, service;
    let scheduleEmail;
    let settings, settingsCache;
    let membersRepository;
    let emailRenderer;
    let sendingService;
    let scheduleRecurringJobs;

    beforeEach(function () {
        memberCount = 123;
        limited = {
            emails: null, // null = not limited, true = limited and error, false = limited no error
            members: null
        };
        verificicationRequired = false;
        scheduleEmail = sinon.stub().returns();
        scheduleRecurringJobs = sinon.stub().resolves();
        settings = {};
        settingsCache = {
            get(key) {
                return settings[key];
            }
        };
        membersRepository = {
            get: sinon.stub().returns(undefined)
        };
        emailRenderer = {
            getSubject: () => {
                return 'Subject';
            },
            getFromAddress: () => {
                return 'From';
            },
            getReplyToAddress: () => {
                return 'ReplyTo';
            },
            renderBody: () => {
                return {
                    html: 'HTML',
                    plaintext: 'Plaintext',
                    replacements: []
                };
            }
        };
        sendingService = {
            send: sinon.stub().returns()
        };

        service = new EmailService({
            emailSegmenter: {
                getMembersCount: () => {
                    return Promise.resolve(memberCount);
                }
            },
            limitService: {
                isLimited: (type) => {
                    return typeof limited[type] === 'boolean';
                },
                errorIfIsOverLimit: (type) => {
                    if (limited[type]) {
                        throw new Error('Over limit');
                    }
                },
                errorIfWouldGoOverLimit: (type) => {
                    if (limited[type]) {
                        throw new Error('Would go over limit');
                    }
                }
            },
            verificationTrigger: {
                checkVerificationRequired: () => {
                    return Promise.resolve(verificicationRequired);
                }
            },
            models: {
                Email: createModelClass()
            },
            batchSendingService: {
                scheduleEmail
            },
            settingsCache,
            emailRenderer,
            membersRepository,
            sendingService,
            emailAnalyticsJobs: {
                scheduleRecurringJobs
            }
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('checkLimits', function () {
        it('Throws if over member limit', async function () {
            limited.members = true;
            await assert.rejects(service.checkLimits(), /Over limit/);
        });

        it('Throws if over email limit', async function () {
            limited.emails = true;
            await assert.rejects(service.checkLimits(), /Would go over limit/);
        });

        it('Throws if verification is required', async function () {
            verificicationRequired = true;
            await assert.rejects(service.checkLimits(), /Email sending is temporarily disabled/);
        });

        it('Does not throw if limits are enabled', async function () {
            // Enable limits, but don't go over limit
            limited.members = false;
            limited.emails = false;
            await assert.doesNotReject(service.checkLimits());
        });
    });

    describe('createEmail', function () {
        it('Throws if post does not have a newsletter', async function () {
            const post = createModel({
                newsletter: null
            });

            await assert.rejects(service.createEmail(post), /The post does not have a newsletter relation/);
        });

        it('Throws if post does not have an active newsletter', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'archived'
                })
            });

            await assert.rejects(service.createEmail(post), /Cannot send email to archived newsletters/);
        });

        it('Creates and schedules an email', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                }),
                mobiledoc: 'Mobiledoc'
            });

            const email = await service.createEmail(post);
            sinon.assert.calledOnce(scheduleEmail);
            assert.strictEqual(email.get('feedback_enabled'), true);
            assert.strictEqual(email.get('newsletter_id'), post.get('newsletter').id);
            assert.strictEqual(email.get('post_id'), post.id);
            assert.strictEqual(email.get('status'), 'pending');
            assert.strictEqual(email.get('source'), post.get('mobiledoc'));
            assert.strictEqual(email.get('source_type'), 'mobiledoc');
            sinon.assert.calledOnce(scheduleRecurringJobs);
        });

        it('Ignores analytics job scheduling errors', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                }),
                mobiledoc: 'Mobiledoc'
            });

            scheduleRecurringJobs.rejects(new Error('Test error'));
            await service.createEmail(post);
            sinon.assert.calledOnce(scheduleRecurringJobs);
        });

        it('Creates and schedules an email with lexical', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                }),
                lexical: 'Lexical'
            });

            const email = await service.createEmail(post);
            sinon.assert.calledOnce(scheduleEmail);
            assert.strictEqual(email.get('feedback_enabled'), true);
            assert.strictEqual(email.get('newsletter_id'), post.get('newsletter').id);
            assert.strictEqual(email.get('post_id'), post.id);
            assert.strictEqual(email.get('status'), 'pending');
            assert.strictEqual(email.get('source'), post.get('lexical'));
            assert.strictEqual(email.get('source_type'), 'lexical');
        });

        it('Stores the error in the email model if scheduling fails', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                })
            });

            scheduleEmail.throws(new Error('Test error'));

            const email = await service.createEmail(post);
            sinon.assert.calledOnce(scheduleEmail);

            assert.strictEqual(email.get('error'), 'Test error');
            assert.strictEqual(email.get('status'), 'failed');
        });

        it('Stores a default error in the email model if scheduling fails', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                })
            });

            scheduleEmail.throws(new Error());

            const email = await service.createEmail(post);
            sinon.assert.calledOnce(scheduleEmail);

            assert.strictEqual(email.get('error'), 'Something went wrong while scheduling the email');
            assert.strictEqual(email.get('status'), 'failed');
        });

        it('Checks limits before scheduling', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                })
            });
            limited.emails = true;

            await assert.rejects(service.createEmail(post));
            sinon.assert.notCalled(scheduleEmail);
        });
    });

    describe('Retry email', function () {
        it('Schedules email again', async function () {
            const email = createModel({
                status: 'failed',
                error: 'Test error',
                post: createModel({
                    status: 'published'
                })
            });

            await service.retryEmail(email);
            sinon.assert.calledOnce(scheduleEmail);
        });

        it('Does not schedule email again if draft', async function () {
            const email = createModel({
                status: 'failed',
                error: 'Test error',
                post: createModel({
                    status: 'draft'
                })
            });

            await assert.rejects(service.retryEmail(email));
            sinon.assert.notCalled(scheduleEmail);
        });

        it('Checks limits before scheduling', async function () {
            const email = createModel({
                status: 'failed',
                error: 'Test error'
            });

            limited.emails = true;
            assert.rejects(service.retryEmail(email));
            sinon.assert.notCalled(scheduleEmail);
        });
    });

    describe('getExampleMember', function () {
        it('Returns a member', async function () {
            const member = createModel({
                uuid: '123',
                name: 'Example member',
                email: 'example@example.com',
                status: 'free'
            });
            membersRepository.get.resolves(member);
            const exampleMember = await service.getExampleMember('example@example.com', 'status:free');
            assert.strictEqual(exampleMember.id, member.id);
            assert.strictEqual(exampleMember.name, member.get('name'));
            assert.strictEqual(exampleMember.email, member.get('email'));
            assert.strictEqual(exampleMember.uuid, member.get('uuid'));
            assert.strictEqual(exampleMember.status, 'free');
            assert.deepEqual(exampleMember.subscriptions, []);
            assert.deepEqual(exampleMember.tiers, []);
        });

        it('Returns a paid member', async function () {
            const member = createModel({
                uuid: '123',
                name: 'Example member',
                email: 'example@example.com',
                status: 'paid',
                stripeSubscriptions: [
                    createModel({
                        status: 'active',
                        current_period_end: new Date(2050, 0, 1),
                        cancel_at_period_end: false
                    })
                ],
                products: [createModel({
                    name: 'Silver',
                    expiry_at: null
                })]
            });
            membersRepository.get.resolves(member);
            const exampleMember = await service.getExampleMember('example@example.com', 'status:-free');
            assert.strictEqual(exampleMember.id, member.id);
            assert.strictEqual(exampleMember.name, member.get('name'));
            assert.strictEqual(exampleMember.email, member.get('email'));
            assert.strictEqual(exampleMember.uuid, member.get('uuid'));
            assert.strictEqual(exampleMember.status, 'paid');
            assert.deepEqual(exampleMember.subscriptions, [
                {
                    status: 'active',
                    current_period_end: new Date(2050, 0, 1),
                    cancel_at_period_end: false,
                    id: member.related('stripeSubscriptions')[0].id
                }
            ]);
            assert.deepEqual(exampleMember.tiers, [
                {
                    name: 'Silver',
                    expiry_at: null,
                    id: member.related('products')[0].id
                }
            ]);
        });

        it('Returns a forced free member', async function () {
            const member = createModel({
                uuid: '123',
                name: 'Example member',
                email: 'example@example.com',
                status: 'paid'
            });
            membersRepository.get.resolves(member);
            const exampleMember = await service.getExampleMember('example@example.com', 'status:free');
            assert.strictEqual(exampleMember.id, member.id);
            assert.strictEqual(exampleMember.name, member.get('name'));
            assert.strictEqual(exampleMember.email, member.get('email'));
            assert.strictEqual(exampleMember.uuid, member.get('uuid'));
            assert.strictEqual(exampleMember.status, 'free');
            assert.deepEqual(exampleMember.subscriptions, []);
            assert.deepEqual(exampleMember.tiers, []);
        });

        it('Returns a member without name if member does not exist', async function () {
            membersRepository.get.resolves(undefined);
            const exampleMember = await service.getExampleMember('example@example.com');
            assert.strictEqual(exampleMember.name, '');
            assert.strictEqual(exampleMember.email, 'example@example.com');
            assert.ok(exampleMember.id);
            assert.ok(exampleMember.uuid);
        });

        it('Returns a default member', async function () {
            membersRepository.get.resolves(undefined);
            const exampleMember = await service.getExampleMember();
            assert.ok(exampleMember.id);
            assert.ok(exampleMember.uuid);
            assert.ok(exampleMember.name);
            assert.ok(exampleMember.email);
        });
    });

    describe('previewEmail', function () {
        it('Replaces replacements with example member', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                })
            });
            sinon.stub(emailRenderer, 'renderBody').resolves({
                html: 'Hello {name}, {name}',
                plaintext: 'Hello {name}',
                replacements: [
                    {
                        id: 'name',
                        token: /{name}/g,
                        getValue: (member) => {
                            return member.name;
                        }
                    }
                ]
            });

            const data = await service.previewEmail(post, post.get('newsletter'), null);
            assert.strictEqual(data.html, 'Hello Jamie Larson, Jamie Larson');
            assert.strictEqual(data.plaintext, 'Hello Jamie Larson');
            assert.strictEqual(data.subject, 'Subject');
        });
    });

    describe('sendTestEmail', function () {
        it('Sends a test email', async function () {
            const post = createModel({
                id: '123',
                newsletter: createModel({
                    status: 'active',
                    feedback_enabled: true
                })
            });
            await service.sendTestEmail(post, post.get('newsletter'), null, ['example@example.com']);
            sinon.assert.calledOnce(sendingService.send);
            const members = sendingService.send.firstCall.args[0].members;
            assert.strictEqual(members.length, 1);
            assert.strictEqual(members[0].email, 'example@example.com');
        });
    });
});
