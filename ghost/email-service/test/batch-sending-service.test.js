const {createModel, createModelClass, createDb, sleep} = require('./utils');
const BatchSendingService = require('../lib/BatchSendingService');
const sinon = require('sinon');
const assert = require('assert/strict');
const logging = require('@tryghost/logging');
const nql = require('@tryghost/nql');
const errors = require('@tryghost/errors');

// We need a short sleep in some tests to simulate time passing
// This way we don't actually add a delay to the tests
const simulateSleep = async (ms, clock) => {
    await Promise.all([sleep(ms), clock.tickAsync(ms)]);
};

describe('Batch Sending Service', function () {
    let errorLog;

    beforeEach(function () {
        errorLog = sinon.stub(logging, 'error');
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
                models: {EmailBatch},
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
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

        it('passes deadline to sendBatches if target delivery window is set', async function () {
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

            const initialMembers = members.slice();

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
                // Check that the filter id:<${lastId} is a string
                // In rare cases when the object ID is numeric, the query returns unexpected results
                assert.equal(typeof q.toJSON().$and[1].id.$lt, 'string');

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
                        return `newsletters.id:'${n.id}'`;
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
            assert.deepEqual(insertedRecipients.map(recipient => recipient.member_id).sort(), initialMembers.map(member => member.id).sort());

            // Check email_count set
            assert.equal(email.get('email_count'), 16);
        });

        it('Does log message to sentry if email_count is off by > 1%', async function () {
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
                // Check that the filter id:<${lastId} is a string
                // In rare cases when the object ID is numeric, the query returns unexpected results
                assert.equal(typeof q.toJSON().$and[1].id.$lt, 'string');

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
            const captureMessage = sinon.stub();

            const service = new BatchSendingService({
                models: {Member, EmailBatch},
                sentry: {
                    captureMessage
                },
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
                        return `newsletters.id:'${n.id}'`;
                    }
                },
                db
            });

            const email = createModel({
                email_count: 15
            });

            await service.createBatches({
                email,
                post: createModel({}),
                newsletter
            });

            assert(captureMessage.calledOnce);
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

            const initialMembers = members.slice();

            Member.getFilteredCollectionQuery = ({filter}) => {
                const q = nql(filter);
                // Check that the filter id:<${lastId} is a string
                // In rare cases when the object ID is numeric, the query returns unexpected results
                assert.equal(typeof q.toJSON().$and[2].id.$lt, 'string');

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
                        return `newsletters.id:'${n.id}'+(${segment})`;
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
            assert.deepEqual(insertedRecipients.map(recipient => recipient.member_id).sort(), initialMembers.map(member => member.id).sort());

            // Check email_count set
            assert.equal(email.get('email_count'), 4);
        });

        // NOTE: we can't fully test this because javascript can't handle a large number (e.g. 650706040078550001536020) - it uses scientific notation
        //  so we have to use a string
        //  ref: https://ghost.slack.com/archives/CTH5NDJMS/p1699359241142969
        it('sends expected emails if a batch ends on a numeric id', async function () {
            const Member = createModelClass({});
            const EmailBatch = createModelClass({});
            const newsletter = createModel({});

            const members = [
                createModel({
                    id: '61a55008a9d68c003baec6df',
                    email: `test1@numericid.com`,
                    uuid: 'test1',
                    status: 'free',
                    newsletters: [
                        newsletter
                    ]
                }),
                createModel({
                    id: '650706040078550001536020', // numeric object id
                    email: `test2@numericid.com`,
                    uuid: 'test2',
                    status: 'free',
                    newsletters: [
                        newsletter
                    ]
                }),
                createModel({
                    id: '65070957007855000153605b',
                    email: `test3@numericid.com`,
                    uuid: 'test3',
                    status: 'free',
                    newsletters: [
                        newsletter
                    ]
                })
            ];

            const initialMembers = members.slice();

            Member.getFilteredCollectionQuery = ({filter}) => {
                const q = nql(filter);
                // Check that the filter id:<${lastId} is a string
                // In rare cases when the object ID is numeric, the query returns unexpected results
                assert.equal(typeof q.toJSON().$and[2].id.$lt, 'string');

                const all = members.filter((member) => {
                    return q.queryJSON(member.toJSON());
                });

                // Sort all by id desc (string) - this is how we keep the order of members consistent (object id is a proxy for created_at)
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
                        return ['status:free'];
                    }
                },
                sendingService: {
                    getMaximumRecipients() {
                        return 2; // pick a batch size that ends with a numeric member object id
                    }
                },
                emailSegmenter: {
                    getMemberFilterForSegment(n, _, segment) {
                        return `newsletters.id:'${n.id}'+(${segment})`;
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
            assert.equal(insertedRecipients.length, 3);

            // Check all recipients match initialMembers
            assert.deepEqual(insertedRecipients.map(recipient => recipient.member_id).sort(), initialMembers.map(member => member.id).sort());

            // Check email_count set
            assert.equal(email.get('email_count'), 3);
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

    describe('getBatches', function () {
        it('returns an array of batch models', async function () {
            const email = createModel({
                id: '123'
            });
            const emailBatches = [
                createModel({email_id: '123'}),
                createModel({email_id: '123'})
            ];

            const EmailBatch = createModelClass({
                findAll: emailBatches
            });
            const service = new BatchSendingService({
                models: {EmailBatch}
            });
            const batches = await service.getBatches(email);
            assert.equal(batches.length, 2);
            assert.ok(Array.isArray(batches));
        });
    });

    describe('sendBatches', function () {
        it('Works for a single batch', async function () {
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
            });
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
            const clock = sinon.useFakeTimers(new Date());
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
            });
            let runningCount = 0;
            let maxRunningCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await simulateSleep(5, clock);
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
            clock.restore();
        });

        it('Works with a target delivery window set', async function () {
            // Set some parameters for sending the batches
            const now = new Date();
            const clock = sinon.useFakeTimers(now);
            const targetDeliveryWindow = 300000; // 5 minutes
            const expectedDeadline = new Date(now.getTime() + targetDeliveryWindow);
            const numBatches = 10;
            const expectedBatchDelay = targetDeliveryWindow / numBatches;
            const email = createModel({
                created_at: now
            });
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return targetDeliveryWindow;
                    }
                }
            });
            let runningCount = 0;
            let maxRunningCount = 0;
            // Stub the sendBatch method to inspect the delivery times for each batch
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await simulateSleep(5, clock);
                runningCount -= 1;
                return Promise.resolve(true);
            });
            // Create the batches
            const batches = new Array(numBatches).fill(0).map(() => createModel({}));
            // Invoke the sendBatches method to send the batches
            await service.sendBatches({
                email,
                batches,
                post: createModel({}),
                newsletter: createModel({})
            });
            // Assert that the sendBatch method was called the correct number of times
            sinon.assert.callCount(sendBatch, numBatches);
            // Get the batches there were sent from the sendBatch method calls
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            // Get the delivery times for each batch from the sendBatch method calls
            const deliveryTimes = sendBatch.getCalls().map(call => call.args[0].deliveryTime);

            // Make sure all delivery times are valid dates, and are before the deadline
            deliveryTimes.forEach((time) => {
                assert.ok(time instanceof Date);
                assert.ok(!isNaN(time.getTime()));
                assert.ok(time <= expectedDeadline);
            });
            // Make sure the delivery times are evenly spaced out, within a reasonable range
            // Sort the delivery times in ascending order (just in case they're not in order)
            deliveryTimes.sort((a, b) => a.getTime() - b.getTime());
            const differences = [];
            for (let i = 1; i < deliveryTimes.length; i++) {
                differences.push(deliveryTimes[i].getTime() - deliveryTimes[i - 1].getTime());
            }
            // Make sure the differences are within a few ms of the expected batch delay
            differences.forEach((difference) => {
                assert.ok(difference >= expectedBatchDelay - 100, `Difference ${difference} is less than expected ${expectedBatchDelay}`);
                assert.ok(difference <= expectedBatchDelay + 100, `Difference ${difference} is greater than expected ${expectedBatchDelay}`);
            });
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
            clock.restore();
        });

        it('omits deliverytime if deadline is in the past', async function () {
            // Set some parameters for sending the batches
            const now = new Date();
            const clock = sinon.useFakeTimers(now);
            const targetDeliveryWindow = 300000; // 5 minutes
            const numBatches = 10;
            const email = createModel({
                created_at: now
            });
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return targetDeliveryWindow;
                    }
                }
            });
            let runningCount = 0;
            let maxRunningCount = 0;
            // Stub the sendBatch method to inspect the delivery times for each batch
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await simulateSleep(5, clock);
                runningCount -= 1;
                return Promise.resolve(true);
            });
            // Create the batches
            const batches = new Array(numBatches).fill(0).map(() => createModel({}));
            // Invoke the sendBatches method to send the batches
            clock.tick(1000000);
            await service.sendBatches({
                email,
                batches,
                post: createModel({}),
                newsletter: createModel({})
            });
            // Assert that the sendBatch method was called the correct number of times
            sinon.assert.callCount(sendBatch, numBatches);
            // Get the batches there were sent from the sendBatch method calls
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            // Get the delivery times for each batch from the sendBatch method calls
            const deliveryTimes = sendBatch.getCalls().map(call => call.args[0].deliveryTime);
            // Assert that the deliverytime is not set, since we're past the deadline
            deliveryTimes.forEach((time) => {
                assert.equal(time, undefined);
            });
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
            clock.restore();
        });

        it('Throws error if all batches fail', async function () {
            const clock = sinon.useFakeTimers(new Date());
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
            });
            let runningCount = 0;
            let maxRunningCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await simulateSleep(5, clock);
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
            clock.restore();
        });

        it('Throws error if a single batch fails', async function () {
            const clock = sinon.useFakeTimers(new Date());
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
            });
            let runningCount = 0;
            let maxRunningCount = 0;
            let callCount = 0;
            const sendBatch = sinon.stub(service, 'sendBatch').callsFake(async () => {
                runningCount += 1;
                maxRunningCount = Math.max(maxRunningCount, runningCount);
                await simulateSleep(5, clock);
                runningCount -= 1;
                callCount += 1;
                return Promise.resolve(callCount === 12 ? false : true);
            });
            const batches = new Array(101).fill(0).map(() => createModel({}));

            /**
             * !! WARNING !!
             * If the error message is changed that it no longer contains the word 'partially',
             * we'll also need the frontend logic in ghost/admin/app/components/editor/modals/publish-flow/complete-with-email-error.js
             */
            await assert.rejects(service.sendBatches({
                email: createModel({}),
                batches,
                post: createModel({}),
                newsletter: createModel({})
            }), /was only partially sent/); // do not change without reading the warning above

            sinon.assert.callCount(sendBatch, 101);
            const sendBatches = sendBatch.getCalls().map(call => call.args[0].batch);
            assert.deepEqual(sendBatches, batches);
            assert.equal(maxRunningCount, 2);
            clock.restore();
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

        it('Does send with a deliverytime', async function () {
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

            const inputDeliveryTime = new Date(Date.now() + 10000);

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({}),
                post: createModel({}),
                newsletter: createModel({}),
                deliveryTime: inputDeliveryTime
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

            const {deliveryTime: outputDeliveryTime} = sendingService.send.firstCall.args[1];
            assert.equal(inputDeliveryTime, outputDeliveryTime);
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

        it('Throws error if more than the maximum are returned in a batch', async function () {
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
                BEFORE_RETRY_CONFIG: {maxRetries: 1, maxTime: 2000, sleep: 1}
            });

            const result = await service.sendBatch({
                email: createModel({}),
                batch: createModel({
                    id: '123_batch_id'
                }),
                post: createModel({}),
                newsletter: createModel({})
            });

            assert.equal(result, false);

            sinon.assert.calledOnce(findOne);
            const batch = await findOne.firstCall.returnValue;
            assert.equal(batch.get('status'), 'failed');
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
            clock.restore();
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
            clock.restore();
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
            clock.restore();
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
            clock.restore();
        });
    });

    describe('getDeliveryDeadline', function () {
        it('returns undefined if the targetDeliveryWindow is not set', async function () {
            const email = createModel({
                created_at: new Date()
            });
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 0;
                    }
                }
            });
            const result = service.getDeliveryDeadline(email);
            assert.equal(result, undefined, 'getDeliveryDeadline should return undefined if target delivery window is <=0');
        });

        it('returns undefined if the email.created_at is not set', async function () { 
            const email = createModel({});
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 300000; // 5 minutes
                    }
                }
            });
            const result = service.getDeliveryDeadline(email);
            assert.equal(result, undefined, 'getDeliveryDeadline should return undefined if email.created_at is not set');
        });

        it('returns undefined if the email.created_at is not a valid date', async function () {
            const email = createModel({
                created_at: 'not a date'
            });
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return 300000; // 5 minutes
                    }
                }
            });
            const result = service.getDeliveryDeadline(email);
            assert.equal(result, undefined, 'getDeliveryDeadline should return undefined if email.created_at is not a valid date');
        });

        it('returns the correct deadline if targetDeliveryWindow is set', async function () {
            const TARGET_DELIVERY_WINDOW = 300000; // 5 minutes
            const emailCreatedAt = new Date();
            const email = createModel({
                created_at: emailCreatedAt
            });
            const expectedDeadline = new Date(emailCreatedAt.getTime() + TARGET_DELIVERY_WINDOW);
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return TARGET_DELIVERY_WINDOW;
                    }
                }
            });
            const result = service.getDeliveryDeadline(email);
            assert.equal(typeof result, 'object');
            assert.equal(result.toUTCString(), expectedDeadline.toUTCString(), 'The delivery deadline should be 5 minutes after the email.created_at timestamp');
        });
    });

    describe('calculateDeliveryTimes', function () {
        it('does add the correct deliverytimes if we are not past the deadline yet', async function () {
            const now = new Date();
            const clock = sinon.useFakeTimers(now);
            const TARGET_DELIVERY_WINDOW = 300000; // 5 minutes
            const email = createModel({
                created_at: now
            });
            const numBatches = 5;
            const delay = TARGET_DELIVERY_WINDOW / numBatches;

            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return TARGET_DELIVERY_WINDOW;
                    }
                }
            });
            const expectedResult = [
                new Date(now.getTime() + (delay * 0)),
                new Date(now.getTime() + (delay * 1)),
                new Date(now.getTime() + (delay * 2)),
                new Date(now.getTime() + (delay * 3)),
                new Date(now.getTime() + (delay * 4))
            ];
            const result = service.calculateDeliveryTimes(email, numBatches);
            assert.deepEqual(result, expectedResult);
            clock.restore();
        });

        it('returns an array of undefined values if we are past the deadline', async function () {
            const now = new Date();
            const clock = sinon.useFakeTimers(now);
            const TARGET_DELIVERY_WINDOW = 300000; // 5 minutes
            const email = createModel({
                created_at: now
            });
            const numBatches = 5;
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return TARGET_DELIVERY_WINDOW;
                    }
                }
            });
            const expectedResult = [
                undefined, undefined, undefined, undefined, undefined
            ];
            // Advance time past the deadline
            clock.tick(1000000);
            const result = service.calculateDeliveryTimes(email, numBatches);
            assert.deepEqual(result, expectedResult);
            clock.restore();
        });

        it('returns an array of undefined values if the target delivery window is not set', async function () {
            const TARGET_DELIVERY_WINDOW = 0;
            const email = createModel({});
            const numBatches = 5;
            const service = new BatchSendingService({
                sendingService: {
                    getTargetDeliveryWindow() {
                        return TARGET_DELIVERY_WINDOW;
                    }
                }
            });
            const expectedResult = [
                undefined, undefined, undefined, undefined, undefined
            ];
            const result = service.calculateDeliveryTimes(email, numBatches);
            assert.deepEqual(result, expectedResult);
        });
    });
});
