const {createModel, createModelClass, createDb, sleep} = require('./utils');
const BatchSendingService = require('../lib/BatchSendingService');
const sinon = require('sinon');
const assert = require('assert/strict');
const logging = require('@tryghost/logging');
const nql = require('@tryghost/nql');
const errors = require('@tryghost/errors');

describe('Batch Sending Service', function () {
    let errorLog;
    let warnLog;

    beforeEach(function () {
        errorLog = sinon.stub(logging, 'error');
        warnLog = sinon.stub(logging, 'warn');
        sinon.stub(logging, 'info');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('works in development mode', async function () {
            const env = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            try {
                new BatchSendingService({});
            } finally {
                process.env.NODE_ENV = env;
            }
        });
    });

    describe('scheduleEmail', function () {
        it('schedules email', async function () {
            const jobsService = {
                addJob: sinon.stub().resolves()
            };
            const service = new BatchSendingService({
                jobsService
            });
            service.scheduleEmail(createModel({}));
            sinon.assert.calledOnce(jobsService.addJob);
            const job = jobsService.addJob.firstCall.args[0].job;
            assert.equal(typeof job, 'function');
        });
    });

    describe('emailJob', function () {
        it('does not send if already submitting', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'submitting'
                }
            });
            const service = new BatchSendingService({
                models: {Email}
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledWith(errorLog, 'Tried sending email that is not pending or failed 123');
        });

        it('does not send if already submitted', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'submitted'
                }
            });
            const service = new BatchSendingService({
                models: {Email}
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledWith(errorLog, 'Tried sending email that is not pending or failed 123');
        });

        it('does send email if pending', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'pending'
                }
            });
            const service = new BatchSendingService({
                models: {Email}
            });
            let emailModel;
            let afterEmailModel;
            const sendEmail = sinon.stub(service, 'sendEmail').callsFake((email) => {
                emailModel = {
                    status: email.get('status')
                };
                afterEmailModel = email;
                return Promise.resolve();
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.notCalled(errorLog);

            sinon.assert.calledOnce(sendEmail);
            assert.equal(emailModel.status, 'submitting', 'The email status is submitting while sending');
            assert.equal(afterEmailModel.get('status'), 'submitted', 'The email status is submitted after sending');
            assert.ok(afterEmailModel.get('submitted_at'));
            assert.equal(afterEmailModel.get('error'), null);
        });

        it('saves error state if sending fails', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'pending'
                }
            });
            const service = new BatchSendingService({
                models: {Email}
            });
            let emailModel;
            let afterEmailModel;
            const sendEmail = sinon.stub(service, 'sendEmail').callsFake((email) => {
                emailModel = {
                    status: email.get('status')
                };
                afterEmailModel = email;
                return Promise.reject(new Error('Unexpected test error'));
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledOnce(sendEmail);
            assert.equal(emailModel.status, 'submitting', 'The email status is submitting while sending');
            assert.equal(afterEmailModel.get('status'), 'failed', 'The email status is failed after sending');
            assert.equal(afterEmailModel.get('error'), 'Unexpected test error');
        });

        it('retries saving error state if sending fails', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'pending'
                }
            });
            const service = new BatchSendingService({
                models: {Email},
                AFTER_RETRY_CONFIG: {maxRetries: 20, maxTime: 2000, sleep: 1}
            });
            let afterEmailModel;
            const sendEmail = sinon.stub(service, 'sendEmail').callsFake((email) => {
                afterEmailModel = email;
                let called = 0;
                const originalSave = email.save;
                email.save = async function () {
                    called += 1;
                    if (called === 2) {
                        return await originalSave.call(this, ...arguments);
                    }
                    throw new Error('Database connection error');
                };
                return Promise.reject(new Error('Unexpected test error'));
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledTwice(errorLog);
            const loggedExeption = errorLog.getCall(1).args[0];
            assert.match(loggedExeption.message, /\[BULK_EMAIL_DB_RETRY\] email 123 -> failed/);
            assert.match(loggedExeption.context, /Database connection error/);
            assert.equal(loggedExeption.code, 'BULK_EMAIL_DB_RETRY');

            sinon.assert.calledOnce(sendEmail);
            assert.equal(afterEmailModel.get('status'), 'failed', 'The email status is failed after sending');
            assert.equal(afterEmailModel.get('error'), 'Unexpected test error');
        });

        it('saves default error message if sending fails', async function () {
            const Email = createModelClass({
                findOne: {
                    status: 'pending'
                }
            });
            const captureException = sinon.stub();
            const service = new BatchSendingService({
                models: {Email},
                sentry: {
                    captureException
                }
            });
            let emailModel;
            let afterEmailModel;
            const sendEmail = sinon.stub(service, 'sendEmail').callsFake((email) => {
                emailModel = {
                    status: email.get('status')
                };
                afterEmailModel = email;
                return Promise.reject(new Error(''));
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledOnce(sendEmail);
            sinon.assert.calledOnce(captureException);

            // Check error code
            const error = errorLog.firstCall.args[0];
            assert.equal(error.code, 'BULK_EMAIL_SEND_FAILED');

            // Check error
            const sentryError = captureException.firstCall.args[0];
            assert.equal(sentryError.message, '');

            assert.equal(emailModel.status, 'submitting', 'The email status is submitting while sending');
            assert.equal(afterEmailModel.get('status'), 'failed', 'The email status is failed after sending');
            assert.equal(afterEmailModel.get('error'), 'Something went wrong while sending the email');
        });
    });

    describe('sendEmail', function () {
        it('does not create batches if already created', async function () {
            const EmailBatch = createModelClass({
                findAll: [
                    {},
                    {}
                ]
            });
            const service = new BatchSendingService({
                models: {EmailBatch}
            });
            const email = createModel({
                status: 'submitting',
                newsletter: createModel({}),
                post: createModel({})
            });

            const sendBatches = sinon.stub(service, 'sendBatches').resolves();
            const createBatches = sinon.stub(service, 'createBatches').resolves();
            const result = await service.sendEmail(email);
            assert.equal(result, undefined);
            sinon.assert.calledOnce(sendBatches);
            sinon.assert.notCalled(createBatches);

            // Check called with batches
            const argument = sendBatches.firstCall.args[0];
            assert.equal(argument.batches.length, 2);
        });

        it('does create batches', async function () {
            const EmailBatch = createModelClass({
                findAll: []
            });
            const service = new BatchSendingService({
                models: {EmailBatch}
            });
            const email = createModel({
                status: 'submitting',
                newsletter: createModel({}),
                post: createModel({})
            });

            const sendBatches = sinon.stub(service, 'sendBatches').resolves();
            const createdBatches = [createModel({})];
            const createBatches = sinon.stub(service, 'createBatches').resolves(createdBatches);
            const result = await service.sendEmail(email);
            assert.equal(result, undefined);
            sinon.assert.calledOnce(sendBatches);
            sinon.assert.calledOnce(createBatches);

            // Check called with created batch
            const argument = sendBatches.firstCall.args[0];
            assert.equal(argument.batches, createdBatches);
        });
    });

    describe('createBatches', function () {
        it('works even when new members are added', async function () {
            const Member = createModelClass({});
            const EmailBatch = createModelClass({});
            const newsletter = createModel({});

            // Create 16 members in single line
            const members = new Array(16).fill(0).map(i => createModel({
                email: `example${i}@example.com`,
                uuid: `member${i}`,
                newsletters: [
                    newsletter
                ]
            }));

            const innitialMembers = members.slice();

            Member.getFilteredCollectionQuery = ({filter}) => {
                // Everytime we request the members, we also create a new member, to simulate that creating batches doesn't happen in a transaction
                // These created members should be excluded
                members.push(createModel({
                    email: `example${members.length}@example.com`,
                    uuid: `member${members.length}`,
                    newsletters: [
                        newsletter
                    ]
                }));

                const q = nql(filter);
                const all = members.filter((member) => {
                    return q.queryJSON(member.toJSON());
                });

                // Sort all by id desc (string)
                all.sort((a, b) => {
                    return b.id.localeCompare(a.id);
                });
                return createDb({
                    all: all.map(member => member.toJSON())
                });
            };

            const db = createDb({});
            const insert = sinon.spy(db, 'insert');

            const service = new BatchSendingService({
                models: {Member, EmailBatch},
                emailRenderer: {
                    getSegments() {
                        return [null];
                    }
                },
                sendingService: {
                    getMaximumRecipients() {
                        return 5;
                    }
                },
                emailSegmenter: {
                    getMemberFilterForSegment(n) {
                        return `newsletters.id:${n.id}`;
                    }
                },
                db
            });

            const email = createModel({});

            // Check we don't include members created after the email model
            members.push(createModel({
                email: `example${members.length}@example.com`,
                uuid: `member${members.length}`,
                newsletters: [
                    newsletter
                ]
            }));

            const batches = await service.createBatches({
                email,
                post: createModel({}),
                newsletter
            });
            assert.equal(batches.length, 4);

            const calls = insert.getCalls();
            assert.equal(calls.length, 4);

            const insertedRecipients = calls.flatMap(call => call.args[0]);
            assert.equal(insertedRecipients.length, 16);

            // Check all recipients match initialMembers
            assert.deepEqual(insertedRecipients.map(recipient => recipient.member_id).sort(), innitialMembers.map(member => member.id).sort());

            // Check email_count set
            assert.equal(email.get('email_count'), 16);
        });

        it('works with multiple batches', async function () {
            const Member = createModelClass({});
            const EmailBatch = createModelClass({});
            const newsletter = createModel({});

            // Create 16 members in single line
            const members = [
                ...new Array(2).fill(0).map(i => createModel({
                    email: `example${i}@example.com`,
                    uuid: `member${i}`,
                    status: 'paid',
                    newsletters: [
                        newsletter
                    ]
                })),
                ...new Array(2).fill(0).map(i => createModel({
                    email: `free${i}@example.com`,
                    uuid: `free${i}`,
                    status: 'free',
                    newsletters: [
                        newsletter
                    ]
                }))
            ];

            const innitialMembers = members.slice();

            Member.getFilteredCollectionQuery = ({filter}) => {
                const q = nql(filter);
                const all = members.filter((member) => {
                    return q.queryJSON(member.toJSON());
                });

                // Sort all by id desc (string)
                all.sort((a, b) => {
                    return b.id.localeCompare(a.id);
                });
                return createDb({
                    all: all.map(member => member.toJSON())
                });
            };

            const db = createDb({});
            const insert = sinon.spy(db, 'insert');

            const service = new BatchSendingService({
                models: {Member, EmailBatch},
                emailRenderer: {
                    getSegments() {
                        return ['status:free', 'status:-free'];
                    }
                },
                sendingService: {
                    getMaximumRecipients() {
                        return 5;
                    }
                },
                emailSegmenter: {
                    getMemberFilterForSegment(n, _, segment) {
                        return `newsletters.id:${n.id}+(${segment})`;
                    }
                },
                db
            });

            const email = createModel({});

            const batches = await service.createBatches({
                email,
                post: createModel({}),
                newsletter
            });
            assert.equal(batches.length, 2);

            const calls = insert.getCalls();
            assert.equal(calls.length, 2);

            const insertedRecipients = calls.flatMap(call => call.args[0]);
            assert.equal(insertedRecipients.length, 4);

            // Check all recipients match initialMembers
            assert.deepEqual(insertedRecipients.map(recipient => recipient.member_id).sort(), innitialMembers.map(member => member.id).sort());

            // Check email_count set
            assert.equal(email.get('email_count'), 4);
        });
    });

    describe('createBatch', function () {
        it('does not create if rows missing data', async function () {
            const EmailBatch = createModelClass({});

            const db = createDb({});
            const insert = sinon.spy(db, 'insert');

            const service = new BatchSendingService({
                models: {EmailBatch},
                db
            });
            const email = createModel({
                status: 'submitting',
                newsletter: createModel({}),
                post: createModel({})
            });
            const members = [
                createModel({}).toJSON(), // <= is missing uuid and email,
                createModel({
                    email: `example1@example.com`,
                    uuid: `member1`
                }).toJSON()
            ];
            await service.createBatch(email, null, members, {});

            const calls = insert.getCalls();
            assert.equal(calls.length, 1);

            const insertedRecipients = calls.flatMap(call => call.args[0]);
            assert.equal(insertedRecipients.length, 1);
        });
    });

    describe('sendBatches', function () {
        it('Works for a single batch', async function () {
            const service = new BatchSendingService({});
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(() => {
                return Promise.resolve(true);
            });
            const batches = [
                createModel({})
            ];
            await service.sendBatches({
                email: createModel({}),
                batches,
                post: createModel({}),
                newsletter: createModel({})
            });
            sinon.assert.calledOnce(sendBatch);
            const arg = sendBatch.firstCall.args[0];
            assert.equal(arg.batch, batches[0]);
        });

        it('Works for more than 2 batches', async function () {
            const service = new BatchSendingService({});
            let runningCount = 0;
            let maxRunningCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await sleep(5);
                runningCount -= 1;
                return Promise.resolve(true);
            });
            const batches = new Array(101).fill(0).map(() => createModel({}));
            await service.sendBatches({
                email: createModel({}),
                batches,
                post: createModel({}),
                newsletter: createModel({})
            });
            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
        });

        it('Throws error if all batches fail', async function () {
            const service = new BatchSendingService({});
            let runningCount = 0;
            let maxRunningCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await sleep(5);
                runningCount -= 1;
                return Promise.resolve(false);
            });
            const batches = new Array(101).fill(0).map(() => createModel({}));
            await assert.rejects(service.sendBatches({
                email: createModel({}),
                batches,
                post: createModel({}),
                newsletter: createModel({})
            }), /An unexpected error occurred, please retry sending your newsletter/);
            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
        });

        it('Throws error if a single batch fails', async function () {
            const service = new BatchSendingService({});
            let runningCount = 0;
            let maxRunningCount = 0;
            let callCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await sleep(5);
                runningCount -= 1;
                callCount += 1;
                return Promise.resolve(callCount === 12 ? false : true);
            });
            const batches = new Array(101).fill(0).map(() => createModel({}));
            await assert.rejects(service.sendBatches({
                email: createModel({}),
                batches,
                post: createModel({}),
                newsletter: createModel({})
            }), /was only partially sent/);
            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
        });
    });

    describe('sendBatch', function () {
        let EmailRecipient;

        beforeEach(function () {
            EmailRecipient = createModelClass({
                findAll: [
                    {
                        member_id: '123',
                        member_uuid: '123',
                        member_email: 'example@example.com',
                        member_name: 'Test User',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            loaded: ['stripeSubscriptions', 'products'],
                            status: 'free',
                            stripeSubscriptions: [],
                            products: []
                        })
                    },
                    {
                        member_id: '124',
                        member_uuid: '124',
                        member_email: 'example2@example.com',
                        member_name: 'Test User 2',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            status: 'free',
                            loaded: ['stripeSubscriptions', 'products'],
                            stripeSubscriptions: [],
                            products: []
                        })
                    }
                ]
            });
        });

        it('Does not send if already submitted', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'submitted'
                }
            });
            const service = new BatchSendingService({
                models: {EmailBatch}
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, true);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledWith(errorLog, sinon.match(/Tried sending email batch that is not pending or failed/));
        });

        it('Does send', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().resolves({id: 'providerid@example.com'}),
                getMaximumRecipients: () => 5
            };

            const findOne = sinon.spy(EmailBatch, 'findOne');
            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient},
                sendingService
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, true);
            sinon.assert.notCalled(errorLog);
            sinon.assert.calledOnce(sendingService.send);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'submitted');
            assert.equal(batch.get('provider_id'), 'providerid@example.com');

            const {members} = sendingService.send.firstCall.args[0];
            assert.equal(members.length, 2);
        });

        it('Does save error', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().rejects(new Error('Test error')),
                getMaximumRecipients: () => 5
            };

            const findOne = sinon.spy(EmailBatch, 'findOne');
            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient},
                sendingService,
                MAILGUN_API_RETRY_CONFIG: {
                    sleep: 10, maxRetries: 5
                }
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, false);
            sinon.assert.callCount(errorLog, 7);
            sinon.assert.callCount(sendingService.send, 6);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'failed');
            assert.equal(batch.get('error_status_code'), null);
            assert.equal(batch.get('error_message'), 'Test error');
            assert.equal(batch.get('error_data'), null);
        });

        it('Does log error to Sentry', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().rejects(new Error('Test error')),
                getMaximumRecipients: () => 5
            };

            const findOne = sinon.spy(EmailBatch, 'findOne');
            const captureException = sinon.stub();
            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient},
                sendingService,
                sentry: {
                    captureException
                },
                MAILGUN_API_RETRY_CONFIG: {
                    maxRetries: 0
                }
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, false);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledOnce(sendingService.send);
            sinon.assert.calledOnce(captureException);
            const sentryExeption = captureException.firstCall.args[0];
            assert.equal(sentryExeption.message, 'Test error');

            const loggedExeption = errorLog.firstCall.args[0];
            assert.match(loggedExeption.message, /Error sending email batch/);
            assert.equal(loggedExeption.context, 'Test error');
            assert.equal(loggedExeption.code, 'BULK_EMAIL_SEND_FAILED');

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'failed');
            assert.equal(batch.get('error_status_code'), null);
            assert.equal(batch.get('error_message'), 'Test error');
            assert.equal(batch.get('error_data'), null);
        });

        it('Does save EmailError', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().rejects(new errors.EmailError({
                    statusCode: 500,
                    message: 'Test error',
                    errorDetails: JSON.stringify({error: 'test', messageData: 'test'}),
                    context: `Mailgun Error 500: Test error`,
                    help: `https://ghost.org/docs/newsletters/#bulk-email-configuration`,
                    code: 'BULK_EMAIL_SEND_FAILED'
                })),
                getMaximumRecipients: () => 5
            };
            const captureException = sinon.stub();
            const findOne = sinon.spy(EmailBatch, 'findOne');
            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient},
                sendingService,
                sentry: {
                    captureException
                },
                MAILGUN_API_RETRY_CONFIG: {
                    maxRetries: 0
                }
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, false);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledOnce(sendingService.send);
            sinon.assert.calledOnce(captureException);
            const sentryExeption = captureException.firstCall.args[0];
            assert.equal(sentryExeption.message, 'Test error');

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'failed');
            assert.equal(batch.get('error_status_code'), 500);
            assert.equal(batch.get('error_message'), 'Test error');
            assert.equal(batch.get('error_data'), '{"error":"test","messageData":"test"}');
        });

        it('Retries fetching recipients if 0 are returned', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().resolves({id: 'providerid@example.com'}),
                getMaximumRecipients: () => 5
            };

            const WrongEmailRecipient = createModelClass({
                findAll: []
            });

            let called = 0;
            const MappedEmailRecipient = {
                ...EmailRecipient,
                findAll() {
                    called += 1;
                    if (called === 1) {
                        return WrongEmailRecipient.findAll(...arguments);
                    }
                    return EmailRecipient.findAll(...arguments);
                }
            };

            const findOne = sinon.spy(EmailBatch, 'findOne');
            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient: MappedEmailRecipient},
                sendingService,
                BEFORE_RETRY_CONFIG: {maxRetries: 10, maxTime: 2000, sleep: 1}
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, true);
            sinon.assert.calledOnce(errorLog);
            const loggedExeption = errorLog.firstCall.args[0];
            assert.match(loggedExeption.message, /\[BULK_EMAIL_DB_RETRY\] getBatchMembers batch/);
            assert.match(loggedExeption.context, /No members found for batch/);
            assert.equal(loggedExeption.code, 'BULK_EMAIL_DB_RETRY');

            sinon.assert.calledOnce(sendingService.send);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'submitted');
            assert.equal(batch.get('provider_id'), 'providerid@example.com');

            const {members} = sendingService.send.firstCall.args[0];
            assert.equal(members.length, 2);
        });

        it('Truncates recipients if more than the maximum are returned in a batch', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    id: '123_batch_id',
                    status: 'pending',
                    member_segment: null
                }
            });
            const findOne = sinon.spy(EmailBatch, 'findOne');

            const DoubleTheEmailRecipients = createModelClass({
                findAll: [
                    {
                        member_id: '123',
                        member_uuid: '123',
                        batch_id: '123_batch_id',
                        member_email: 'example@example.com',
                        member_name: 'Test User',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            loaded: ['stripeSubscriptions', 'products'],
                            status: 'free',
                            stripeSubscriptions: [],
                            products: []
                        })
                    },
                    {
                        member_id: '124',
                        member_uuid: '124',
                        batch_id: '123_batch_id',
                        member_email: 'example2@example.com',
                        member_name: 'Test User 2',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            status: 'free',
                            loaded: ['stripeSubscriptions', 'products'],
                            stripeSubscriptions: [],
                            products: []
                        })
                    },
                    {
                        member_id: '125',
                        member_uuid: '125',
                        batch_id: '123_batch_id',
                        member_email: 'example3@example.com',
                        member_name: 'Test User 3',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            status: 'free',
                            loaded: ['stripeSubscriptions', 'products'],
                            stripeSubscriptions: [],
                            products: []
                        })
                    },
                    // NOTE: one recipient from a different batch
                    {
                        member_id: '125',
                        member_uuid: '125',
                        batch_id: '124_ANOTHER_batch_id',
                        member_email: 'example3@example.com',
                        member_name: 'Test User 3',
                        loaded: ['member'],
                        member: createModel({
                            created_at: new Date(),
                            status: 'free',
                            loaded: ['stripeSubscriptions', 'products'],
                            stripeSubscriptions: [],
                            products: []
                        })
                    }
                ]
            });

            const sendingService = {
                send: sinon.stub().resolves({id: 'providerid@example.com'}),
                getMaximumRecipients: () => 2
            };

            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient: DoubleTheEmailRecipients},
                sendingService,
                BEFORE_RETRY_CONFIG: {maxRetries: 10, maxTime: 2000, sleep: 1}
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({
                    id: '123_batch_id'
                }),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, true);

            sinon.assert.calledOnce(warnLog);
            const firstLoggedWarn = warnLog.firstCall.args[0];
            assert.match(firstLoggedWarn, /Email batch 123_batch_id has 4 members, which exceeds the maximum of 2 members per batch. Filtering by batch_id: 123_batch_id/);

            sinon.assert.calledOnce(errorLog);
            const firstLoggedError = errorLog.firstCall.args[0];

            assert.match(firstLoggedError, /Email batch 123_batch_id has 3 members, which exceeds the maximum of 2. Truncating to 2/);

            sinon.assert.calledOnce(sendingService.send);
            const {members} = sendingService.send.firstCall.args[0];
            assert.equal(members.length, 2);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'submitted');
            assert.equal(batch.get('provider_id'), 'providerid@example.com');
        });

        it('Stops retrying after the email retry cut off time', async function () {
            const EmailBatch = createModelClass({
                findOne: {
                    status: 'pending',
                    member_segment: null
                }
            });
            const sendingService = {
                send: sinon.stub().resolves({id: 'providerid@example.com'}),
                getMaximumRecipients: () => 5
            };

            const WrongEmailRecipient = createModelClass({
                findAll: []
            });

            let called = 0;
            const MappedEmailRecipient = {
                ...EmailRecipient,
                findAll() {
                    called += 1;
                    return WrongEmailRecipient.findAll(...arguments);
                }
            };

            const service = new BatchSendingService({
                models: {EmailBatch, EmailRecipient: MappedEmailRecipient},
                sendingService,
                BEFORE_RETRY_CONFIG: {maxRetries: 10, maxTime: 2000, sleep: 300}
            });

            const email = createModel({});
            email._retryCutOffTime = new Date(Date.now() + 400);

            const result = await service.sendBatch({
                email,
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({})
            });
            assert.equal(called, 2);

            assert.equal(result, false);
            sinon.assert.calledThrice(errorLog); // First retry, second retry failed + bulk email send failed
            const loggedExeption = errorLog.firstCall.args[0];
            assert.match(loggedExeption.message, /\[BULK_EMAIL_DB_RETRY\] getBatchMembers batch/);
            assert.match(loggedExeption.context, /No members found for batch/);
            assert.equal(loggedExeption.code, 'BULK_EMAIL_DB_RETRY');

            sinon.assert.notCalled(sendingService.send);
        });
    });

    describe('getBatchMembers', function () {
        it('Works for recipients without members', async function () {
            const EmailRecipient = createModelClass({
                findAll: [
                    {
                        member_id: '123',
                        member_uuid: '123',
                        member_email: 'example@example.com',
                        member_name: 'Test User',
                        loaded: ['member'],
                        member: null
                    }
                ]
            });

            const service = new BatchSendingService({
                models: {EmailRecipient},
                sendingService: {
                    getMaximumRecipients: () => 5
                }
            });

            const result = await service.getBatchMembers('id123');
            assert.equal(result.length, 1);
            assert.equal(result[0].createdAt, null);
        });
    });

    describe('retryDb', function () {
        it('Does retry', async function () {
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = await service.retryDb(() => {
                callCount += 1;
                if (callCount === 3) {
                    return 'ok';
                }
                throw new Error('Test error');
            }, {
                maxRetries: 2, sleep: 10
            });
            assert.equal(result, 'ok');
            assert.equal(callCount, 3);
        });

        it('Stops after maxRetries', async function () {
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = service.retryDb(() => {
                callCount += 1;
                if (callCount === 3) {
                    return 'ok';
                }
                throw new Error('Test error');
            }, {
                maxRetries: 1, sleep: 10
            });
            await assert.rejects(result, /Test error/);
            assert.equal(callCount, 2);
        });

        it('Stops after stopAfterDate', async function () {
            const clock = sinon.useFakeTimers({now: new Date(2023, 0, 1, 0, 0, 0, 0), shouldAdvanceTime: true});
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = service.retryDb(() => {
                callCount += 1;
                clock.tick(1000 * 60);
                throw new Error('Test error');
            }, {
                maxRetries: 1000, stopAfterDate: new Date(2023, 0, 1, 0, 2, 50)
            });
            await assert.rejects(result, /Test error/);
            assert.equal(callCount, 3);
        });

        it('Stops after maxTime', async function () {
            const clock = sinon.useFakeTimers({now: new Date(2023, 0, 1, 0, 0, 0, 0), shouldAdvanceTime: true});
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = service.retryDb(() => {
                callCount += 1;
                clock.tick(1000 * 60);
                throw new Error('Test error');
            }, {
                maxRetries: 1000, maxTime: 1000 * 60 * 3 - 1
            });
            await assert.rejects(result, /Test error/);
            assert.equal(callCount, 3);
        });

        it('Resolves after maxTime', async function () {
            const clock = sinon.useFakeTimers({now: new Date(2023, 0, 1, 0, 0, 0, 0), shouldAdvanceTime: true});
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = await service.retryDb(() => {
                callCount += 1;
                clock.tick(1000 * 60);

                if (callCount === 3) {
                    return 'ok';
                }
                throw new Error('Test error');
            }, {
                maxRetries: 1000, maxTime: 1000 * 60 * 3
            });
            assert.equal(result, 'ok');
            assert.equal(callCount, 3);
        });

        it('Resolves with stopAfterDate', async function () {
            const clock = sinon.useFakeTimers({now: new Date(2023, 0, 1, 0, 0, 0, 0), shouldAdvanceTime: true});
            const service = new BatchSendingService({});
            let callCount = 0;
            const result = await service.retryDb(() => {
                callCount += 1;
                clock.tick(1000 * 60);
                if (callCount === 4) {
                    return 'ok';
                }
                throw new Error('Test error');
            }, {
                maxRetries: 1000, stopAfterDate: new Date(2023, 0, 1, 0, 10, 50)
            });
            assert.equal(result, 'ok');
            assert.equal(callCount, 4);
        });
    });
});
