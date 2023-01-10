const {createModel, createModelClass, createDb, sleep} = require('./utils');
const BatchSendingService = require('../lib/batch-sending-service');
const sinon = require('sinon');
const assert = require('assert');
const logging = require('@tryghost/logging');
const nql = require('@tryghost/nql');
const errors = require('@tryghost/errors');

describe('Batch Sending Service', function () {
    let errorLog;

    beforeEach(function () {
        errorLog = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
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

        it('saves default error message if sending fails', async function () {
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
                return Promise.reject(new Error(''));
            });
            const result = await service.emailJob({emailId: '123'});
            assert.equal(result, undefined);
            sinon.assert.calledOnce(errorLog);
            sinon.assert.calledOnce(sendEmail);
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

        it('Works for more than 10 batches', async function () {
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
            assert.equal(maxRunningCount, 10);
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
            }), /Email failed to send/);
            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 10);
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
            }), /The email was only partially send/);
            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 10);
        });
    });

    describe('sendBatch', function () {
        let EmailRecipient;

        beforeEach(function () {
            EmailRecipient = createModelClass({
                findAll: [
                    createModel({
                        member_id: '123',
                        member_uuid: '123',
                        member_email: 'example@example.com',
                        member_name: 'Test User'
                    }),
                    createModel({
                        member_id: '124',
                        member_uuid: '124',
                        member_email: 'example2@example.com',
                        member_name: 'Test User 2'
                    })
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
                send: sinon.stub().resolves({id: 'providerid@example.com'})
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
                send: sinon.stub().rejects(new Error('Test error'))
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

            assert.equal(result, false);
            sinon.assert.calledTwice(errorLog);
            sinon.assert.calledOnce(sendingService.send);

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
                }))
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

            assert.equal(result, false);
            sinon.assert.calledTwice(errorLog);
            sinon.assert.calledOnce(sendingService.send);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'failed');
            assert.equal(batch.get('error_status_code'), 500);
            assert.equal(batch.get('error_message'), 'Test error');
            assert.equal(batch.get('error_data'), '{"error":"test","messageData":"test"}');
        });
    });
});
