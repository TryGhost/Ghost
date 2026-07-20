const Tier = require('../../../../../../core/server/services/tiers/tier');
const ObjectID = require('bson-objectid').default;
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const sinon = require('sinon');
const MembersCSVImporter = require('../../../../../../core/server/services/members/importer/members-csv-importer');

const csvPath = path.join(__dirname, '/fixtures/');

describe('MembersCSVImporter', function () {
    let memberCreateStub;
    let knexStub;
    let sendEmailStub;
    let membersRepositoryStub;
    let stripeUtilsStub;
    let addJobStub;
    let defaultTierId;

    const defaultAllowedFields = {
        email: 'email',
        name: 'name',
        note: 'note',
        subscribed_to_emails: 'subscribed_to_emails',
        created_at: 'created_at',
        complimentary_plan: 'complimentary_plan',
        stripe_customer_id: 'stripe_customer_id',
        labels: 'labels',
        import_tier: 'import_tier'
    };

    afterEach(function () {
        sinon.restore();
    });

    const rowsFor = async (importer, filename) => {
        const {rows} = await importer.prepare(`${csvPath}/${filename}`);
        return rows;
    };

    const buildMockImporterInstance = (deps = {}) => {
        defaultTierId = new ObjectID();
        const defaultTierDummy = new Tier({
            id: defaultTierId
        });

        memberCreateStub = sinon.stub().resolves({
            id: `test_member_id`
        });
        membersRepositoryStub = {
            get: async () => {
                return null;
            },
            create: memberCreateStub,
            update: sinon.stub().resolves(null),
            linkStripeCustomer: sinon.stub().resolves(null),
            getCustomerIdByEmail: sinon.stub().resolves('cus_mock_123456')
        };
        const trxStub = sinon.stub();
        trxStub.rollback = () => {};
        trxStub.commit = () => {};

        knexStub = {
            transaction: sinon.stub().resolves(trxStub)
        };
        sendEmailStub = sinon.stub();
        addJobStub = sinon.stub();
        stripeUtilsStub = {
            forceStripeSubscriptionToProduct: sinon.stub().resolves({}),
            archivePrice: sinon.stub().resolves()
        };

        return new MembersCSVImporter({
            getMembersRepository: () => {
                return membersRepositoryStub;
            },
            getDefaultTier: () => {
                return defaultTierDummy;
            },
            sendEmail: sendEmailStub,
            isSet: sinon.stub(),
            addJob: addJobStub,
            knex: knexStub,
            // The completion email builds URLs from this, so it has to return one
            urlFor: sinon.stub().returns('https://example.com/'),
            context: {importer: true},
            stripeUtils: stripeUtilsStub,
            ...deps
        });
    };

    // The queued path is the only one that writes anything to disk: an inline import
    // finishes inside the request, a queued one outlives it and the uploaded CSV is
    // gone by then.
    describe('process (queued)', function () {
        let testImportThresholdStub;

        const queue = async (importer, overrides = {}) => {
            const spoolRows = sinon.spy(importer, 'spoolRows');
            testImportThresholdStub = sinon.stub().resolves();

            const result = await importer.process({
                pathToCSV: `${csvPath}/member-csv-export.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {name: 'Test Import'},
                user: {email: 'importer@example.com'},
                LabelModel: {findOne: sinon.stub().resolves({name: 'Test Import', toJSON: () => ({name: 'Test Import'})})},
                verificationTrigger: {testImportThreshold: testImportThresholdStub},
                ...overrides
            });

            const {job, data} = addJobStub.firstCall.args[0];

            return {
                result,
                data,
                spoolPath: await spoolRows.firstCall.returnValue,
                runJob: () => job(data)
            };
        };

        it('queues a job rather than importing in the request', async function () {
            const importer = buildMockImporterInstance();

            const {result, spoolPath} = await queue(importer);

            try {
                sinon.assert.calledOnce(addJobStub);
                assert.equal(addJobStub.firstCall.args[0].name, 'members-import');
                assert.equal(result.meta.stats, undefined, 'a queued import has no stats to report yet');
                assert.equal(result.meta.originalImportSize, 2);
                sinon.assert.notCalled(membersRepositoryStub.create);
            } finally {
                await fs.remove(spoolPath);
            }
        });

        // Everything the job needs to run has to be plain data, so that a queue which
        // stores its jobs has something it can store.
        it('carries the job everything it needs as plain data', async function () {
            const importer = buildMockImporterInstance();

            const {data, spoolPath} = await queue(importer);

            try {
                assert.deepEqual(data, {
                    spoolPath,
                    emailRecipient: 'importer@example.com',
                    importLabel: {name: 'Test Import'}
                });
                assert.deepEqual(JSON.parse(JSON.stringify(data)), data, 'the payload must survive serialisation');
            } finally {
                await fs.remove(spoolPath);
            }
        });

        it('spools the parsed rows for the job to read back', async function () {
            const importer = buildMockImporterInstance();

            const {spoolPath} = await queue(importer);

            try {
                assert.equal(await fs.pathExists(spoolPath), true);
                const spooled = await importer.readSpooledRows(spoolPath);
                assert.equal(spooled.length, 2);
                assert.equal(spooled[0].email, 'member_complimentary_test@example.com');
            } finally {
                await fs.remove(spoolPath);
            }
        });

        it('imports the spooled rows when the job runs, then removes the spool', async function () {
            const importer = buildMockImporterInstance();

            const {spoolPath, runJob} = await queue(importer);
            await runJob();

            sinon.assert.calledTwice(membersRepositoryStub.create);
            assert.equal(await fs.pathExists(spoolPath), false, 'the job owns the spool and cleans it up');
        });

        it('emails the result to whoever started the import', async function () {
            const importer = buildMockImporterInstance();

            const {runJob} = await queue(importer);
            await runJob();

            sinon.assert.calledOnce(sendEmailStub);
            const email = sendEmailStub.firstCall.args[0];
            assert.equal(email.to, 'importer@example.com');
            assert.equal(email.subject, 'Your member import is complete');
            assert.equal(email.attachments[0].filename, 'Test Import - Errors.csv');
        });

        it('reports an import that created nobody as unsuccessful', async function () {
            const importer = buildMockImporterInstance();
            const {runJob} = await queue(importer);

            sinon.stub(importer, 'perform').resolves({total: 2, imported: 0, errors: []});

            await runJob();

            assert.equal(sendEmailStub.firstCall.args[0].subject, 'Your member import was unsuccessful');
        });

        // The threshold is the anti-spam control on bulk member creation, and the
        // queued path is the one where nobody is watching the response.
        it('checks the import threshold once the job has run', async function () {
            const importer = buildMockImporterInstance();

            const {runJob} = await queue(importer);
            await runJob();

            sinon.assert.calledOnce(testImportThresholdStub);
        });

        it('checks the import threshold even when the import throws', async function () {
            const importer = buildMockImporterInstance();
            const {spoolPath, runJob} = await queue(importer);

            sinon.stub(importer, 'perform').rejects(new Error('boom'));

            await runJob();

            sinon.assert.calledOnce(testImportThresholdStub);
            await fs.remove(spoolPath);
        });

        it('removes the spool when the import throws', async function () {
            const importer = buildMockImporterInstance();
            const {spoolPath, runJob} = await queue(importer);

            sinon.stub(importer, 'perform').rejects(new Error('boom'));

            await runJob();

            assert.equal(await fs.pathExists(spoolPath), false, 'a failed import must not leave member data behind');
        });

        it('does not leave a spool behind if the job could not be queued', async function () {
            const importer = buildMockImporterInstance();
            const spoolRows = sinon.spy(importer, 'spoolRows');
            addJobStub.throws(new Error('queue is down'));

            await assert.rejects(() => importer.process({
                pathToCSV: `${csvPath}/member-csv-export.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {name: 'Test Import'},
                user: {email: 'importer@example.com'},
                LabelModel: {findOne: sinon.stub()},
                verificationTrigger: {testImportThreshold: sinon.stub()}
            }));

            const spoolPath = await spoolRows.firstCall.returnValue;
            assert.equal(await fs.pathExists(spoolPath), false, 'nothing owns the spool if the job never existed');
        });
    });

    // Which side of this an import lands on decides whether the publisher gets their
    // result in the response or by email, so the boundary is worth pinning.
    describe('the inline and queued boundary', function () {
        const csvWithRows = async (count) => {
            const file = path.join(os.tmpdir(), `members-threshold-${crypto.randomUUID()}.csv`);
            const emails = Array.from({length: count}, (_, i) => `member${i}@example.com`);
            await fs.writeFile(file, `email\n${emails.join('\n')}\n`);
            return file;
        };

        const importOf = async (importer, rowCount) => {
            const pathToCSV = await csvWithRows(rowCount);

            try {
                return await importer.process({
                    pathToCSV,
                    headerMapping: {email: 'email'},
                    importLabel: {name: 'Test Import'},
                    user: {email: 'importer@example.com'},
                    LabelModel: {findOne: sinon.stub().resolves(null)},
                    verificationTrigger: {testImportThreshold: sinon.stub().resolves()}
                });
            } finally {
                await fs.remove(pathToCSV);
            }
        };

        it('imports 500 rows inside the request', async function () {
            const importer = buildMockImporterInstance();

            const result = await importOf(importer, 500);

            sinon.assert.notCalled(addJobStub);
            assert.equal(result.meta.stats.imported, 500);
        });

        it('queues 501 rows', async function () {
            const importer = buildMockImporterInstance();
            const spoolRows = sinon.spy(importer, 'spoolRows');

            const result = await importOf(importer, 501);

            sinon.assert.calledOnce(addJobStub);
            assert.equal(result.meta.stats, undefined);
            assert.equal(result.meta.originalImportSize, 501);
            await fs.remove(await spoolRows.firstCall.returnValue);
        });
    });

    describe('inline and queued imports agree', function () {
        const runFor = async (importer, overrides) => {
            await importer.process({
                pathToCSV: `${csvPath}/member-csv-export.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {name: 'Test Import'},
                user: {email: 'importer@example.com'},
                LabelModel: {findOne: sinon.stub().resolves({name: 'Test Import', toJSON: () => ({name: 'Test Import'})})},
                verificationTrigger: {testImportThreshold: sinon.stub().resolves()},
                ...overrides
            });
        };

        // The spool sits between parsing and importing on one path and not the other,
        // so the two have to end up creating the same member records.
        it('creates the same member records either way', async function () {
            const inlineImporter = buildMockImporterInstance();
            await runFor(inlineImporter, {forceInline: true});
            const inlineArgs = membersRepositoryStub.create.args.map(([values]) => values);

            const queuedImporter = buildMockImporterInstance();
            const spoolRows = sinon.spy(queuedImporter, 'spoolRows');
            await runFor(queuedImporter);
            const {job, data} = addJobStub.firstCall.args[0];
            await job(data);
            const queuedArgs = membersRepositoryStub.create.args.map(([values]) => values);

            assert.deepEqual(queuedArgs, inlineArgs);
            await fs.remove(await spoolRows.firstCall.returnValue).catch(() => {});
        });
    });

    describe('spooled rows', function () {
        // JSON rather than re-serialised CSV, so a column the member model knows
        // nothing about still reaches the import that reads it back.
        it('round-trips a row carrying a column outside the model set', async function () {
            const importer = buildMockImporterInstance();
            const rows = [{email: 'a@b.com', subscribed: false, labels: [{name: 'VIP'}], favourite_colour: 'blue'}];

            const spoolPath = await importer.spoolRows(rows);
            try {
                assert.deepEqual(await importer.readSpooledRows(spoolPath), rows);
            } finally {
                await fs.remove(spoolPath);
            }
        });

        // The spool holds member names, emails and Stripe ids in a directory shared
        // with every other process on the host.
        it('is readable only by the user that wrote it', async function () {
            const importer = buildMockImporterInstance();

            const spoolPath = await importer.spoolRows([{email: 'a@b.com'}]);

            try {
                const {mode} = await fs.stat(spoolPath);
                assert.equal((mode & 0o777).toString(8), '600');
            } finally {
                await fs.remove(spoolPath);
            }
        });

        it('does not collide when two imports are spooled at once', async function () {
            const importer = buildMockImporterInstance();

            const [a, b] = await Promise.all([
                importer.spoolRows([{email: 'a@b.com'}]),
                importer.spoolRows([{email: 'b@b.com'}])
            ]);

            try {
                assert.notEqual(a, b);
                assert.deepEqual(await importer.readSpooledRows(a), [{email: 'a@b.com'}]);
                assert.deepEqual(await importer.readSpooledRows(b), [{email: 'b@b.com'}]);
            } finally {
                await Promise.all([fs.remove(a), fs.remove(b)]);
            }
        });
    });

    describe('process', function () {
        it('should import a CSV file', async function () {
            const LabelModelStub = {
                findOne: sinon.stub().resolves(null)
            };

            const importer = buildMockImporterInstance();

            const result = await importer.process({
                pathToCSV: `${csvPath}/single-column-with-header.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {
                    name: 'test import'
                },
                user: {
                    email: 'test@example.com'
                },
                LabelModel: LabelModelStub,
                verificationTrigger: {
                    testImportThreshold: () => {}
                }
            });

            assertExists(result.meta);
            assertExists(result.meta.stats);
            assertExists(result.meta.stats.imported);
            assert.equal(result.meta.stats.imported, 2);

            assertExists(result.meta.stats.invalid);
            assert.equal(result.meta.import_label, null);

            assertExists(result.meta.originalImportSize);
            assert.equal(result.meta.originalImportSize, 2);

            // Called at least once
            assert.equal(memberCreateStub.notCalled, false);
            assert.equal(memberCreateStub.firstCall.lastArg.context.import, true);
        });

        it('should import a CSV in the default Members export format', async function () {
            const internalLabel = {
                name: 'Test Import'
            };
            const LabelModelStub = {
                findOne: sinon.stub()
                    .withArgs({
                        name: 'Test Import'
                    })
                    .resolves({
                        name: 'Test Import'
                    })
            };

            const importer = buildMockImporterInstance();
            const result = await importer.process({
                pathToCSV: `${csvPath}/member-csv-export.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {
                    name: 'Test Import'
                },
                user: {
                    email: 'test@example.com'
                },
                LabelModel: LabelModelStub,
                forceInline: true,
                verificationTrigger: {
                    testImportThreshold: () => {}
                }
            });

            assertExists(result.meta);
            assertExists(result.meta.stats);
            assertExists(result.meta.stats.imported);
            assert.equal(result.meta.stats.imported, 2);

            assertExists(result.meta.stats.invalid);
            assert.deepEqual(result.meta.import_label, internalLabel);

            assertExists(result.meta.originalImportSize);
            assert.equal(result.meta.originalImportSize, 2);

            // member records get inserted
            sinon.assert.calledTwice(membersRepositoryStub.create);

            assert.equal(membersRepositoryStub.create.args[0][1].context.import, true, 'inserts are done in the "import" context');

            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[0][0].id, undefined, 'id field should not be taken from the user input');
            assert.equal(membersRepositoryStub.create.args[0][0].email, 'member_complimentary_test@example.com');
            assert.equal(membersRepositoryStub.create.args[0][0].name, 'bobby tables');
            assert.equal(membersRepositoryStub.create.args[0][0].note, 'a note');
            assert.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            assert.equal(membersRepositoryStub.create.args[0][0].created_at, '2022-10-18T06:34:08.000Z');
            assert.equal(membersRepositoryStub.create.args[0][0].deleted_at, undefined, 'deleted_at field should not be taken from the user input');
            assert.deepEqual(membersRepositoryStub.create.args[0][0].labels, [{
                name: 'user import label'
            }]);

            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[1][0].id, undefined, 'id field should not be taken from the user input');
            assert.equal(membersRepositoryStub.create.args[1][0].email, 'member_stripe_test@example.com');
            assert.equal(membersRepositoryStub.create.args[1][0].name, 'stirpey beaver');
            assert.equal(membersRepositoryStub.create.args[1][0].note, 'testing notes');
            assert.equal(membersRepositoryStub.create.args[1][0].subscribed, false);
            assert.equal(membersRepositoryStub.create.args[1][0].created_at, '2022-10-18T07:31:57.000Z');
            assert.equal(membersRepositoryStub.create.args[1][0].deleted_at, undefined, 'deleted_at field should not be taken from the user input');
            assert.deepEqual(membersRepositoryStub.create.args[1][0].labels, [], 'no labels should be assigned');

            // stripe customer import
            sinon.assert.calledOnce(membersRepositoryStub.linkStripeCustomer);
            assert.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].customer_id, 'cus_MdR9tqW6bAreiq');
            assert.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].member_id, 'test_member_id');
            assert.equal(membersRepositoryStub.linkStripeCustomer.args[0][1].context.importer, true, 'linkStripeCustomer is called with importer context to prevent welcome emails');

            // complimentary_plan import
            sinon.assert.calledOnce(membersRepositoryStub.update);
            assert.deepEqual(membersRepositoryStub.update.args[0][0].products, [{
                id: defaultTierId.toString()
            }]);
            assert.deepEqual(membersRepositoryStub.update.args[0][1].id, 'test_member_id');
        });

        it('should subscribe or unsubscribe members as per the `subscribe_to_emails` column', async function () {
            /**
             * @NOTE This tests all the different scenarios for the `subscribed_to_emails` column for existing and new members
             * For existing members with at least one newsletter subscription:
             * CASE 1: If `subscribe_to_emails` is `true`, the member should remain subscribed (but not added to any additional newsletters)
             * CASE 2: If `subscribe_to_emails` is `false`, the member should be unsubscribed from all newsletters
             * CASE 3: If `subscribe_to_emails` is NULL, the member should remain subscribed (but not added to any additional newsletters)
             * CASE 4: If `subscribe_to_emails` is empty, the member should remain subscribed (but not added to any additional newsletters)
             * CASE 5: If `subscribe_to_emails` is invalid, the member should remain subscribed (but not added to any additional newsletters)
             *
             *
             * For existing members with no newsletter subscriptions:
             * CASE 6: If `subscribe_to_emails` is `true`, the member should remain unsubscribed (as they likely have previously unsubscribed)
             * CASE 7: If `subscribe_to_emails` is `false`, the member should remain unsubscribed
             * CASE 8: If `subscribe_to_emails` is NULL, the member should remain unsubscribed
             * CASE 9: If `subscribe_to_emails` is empty, the member should remain unsubscribed
             * CASE 10: If `subscribe_to_emails` is invalid, the member should remain unsubscribed
             *
             * - In summary, an existing member with no pre-existing newsletter subscriptions should _never_ be subscribed to newsletters upon import
             *
             * For new members:
             * CASE 11: If `subscribe_to_emails` is `true`, the member should be created and subscribed
             * CASE 12: If `subscribe_to_emails` is `false`, the member should be created but not subscribed
             * CASE 13: If `subscribe_to_emails` is NULL, the member should be created and subscribed
             * CASE 14: If `subscribe_to_emails` is empty, the member should be created and subscribed
             * CASE 15: If `subscribe_to_emails` is invalid, the member should be created and subscribed
             */

            const internalLabel = {
                name: 'Test Subscription Import'
            };
            const LabelModelStub = {
                findOne: sinon.stub()
                    .withArgs({
                        name: 'Test Subscription Import'
                    })
                    .resolves({
                        name: 'Test Subscription Import'
                    })
            };

            const importer = buildMockImporterInstance();

            const defaultNewsletters = [
                {id: 'newsletter_1'},
                {id: 'newsletter_2'}
            ];

            const existingMembers = [
                {email: 'member_subscribed_true@example.com', newsletters: defaultNewsletters},
                {email: 'member_subscribed_null@example.com', newsletters: defaultNewsletters},
                {email: 'member_subscribed_false@example.com', newsletters: defaultNewsletters},
                {email: 'member_subscribed_empty@example.com', newsletters: defaultNewsletters},
                {email: 'member_subscribed_invalid@example.com', newsletters: defaultNewsletters},
                {email: 'member_not_subscribed_true@example.com', newsletters: []},
                {email: 'member_not_subscribed_null@example.com', newsletters: []},
                {email: 'member_not_subscribed_false@example.com', newsletters: []},
                {email: 'member_not_subscribed_empty@example.com', newsletters: []},
                {email: 'member_not_subscribed_invalid@example.com', newsletters: []}
            ];

            membersRepositoryStub.get = sinon.stub();

            for (const existingMember of existingMembers) {
                const newslettersCollection = {
                    length: existingMember.newsletters.length,
                    toJSON: sinon.stub().returns(existingMember.newsletters)
                };
                const memberRecord = {
                    related: sinon.stub()
                };
                memberRecord.related.withArgs('labels').returns(null);
                memberRecord.related.withArgs('newsletters').returns(newslettersCollection);
                membersRepositoryStub.get.withArgs({email: existingMember.email}).resolves(memberRecord);
            }

            const result = await importer.process({
                pathToCSV: `${csvPath}/subscribed-to-emails-cases.csv`,
                headerMapping: defaultAllowedFields,
                importLabel: {
                    name: 'Test Subscription Import'
                },
                user: {
                    email: 'test@example.com'
                },
                LabelModel: LabelModelStub,
                forceInline: true,
                verificationTrigger: {
                    testImportThreshold: () => {}
                }
            });

            assertExists(result.meta);
            assertExists(result.meta.stats);
            assertExists(result.meta.stats.imported);
            assert.equal(result.meta.stats.imported, 5);

            assertExists(result.meta.stats.invalid);
            assert.deepEqual(result.meta.import_label, internalLabel);

            assertExists(result.meta.originalImportSize);
            assert.equal(result.meta.originalImportSize, 15);

            // member records get inserted
            sinon.assert.callCount(membersRepositoryStub.create, 5);

            assert.equal(membersRepositoryStub.create.args[0][1].context.import, true, 'inserts are done in the "import" context');

            // CASE 1: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is true
            // Member's newsletter subscriptions should not change
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            assert.equal(membersRepositoryStub.update.args[0][0].email, 'member_subscribed_true@example.com');
            assert.equal(membersRepositoryStub.update.args[0][0].subscribed, true);
            assert.deepEqual(membersRepositoryStub.update.args[0][0].newsletters, defaultNewsletters);

            // CASE 2: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is false
            // Member's newsletter subscriptions should be removed
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[1][0].email, 'member_subscribed_false@example.com');
            assert.equal(membersRepositoryStub.update.args[1][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[1][0].newsletters, undefined);

            // CASE 3: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is NULL
            // Member's newsletter subscriptions should not change
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[2][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            assert.equal(membersRepositoryStub.update.args[2][0].email, 'member_subscribed_null@example.com');
            assert.equal(membersRepositoryStub.update.args[2][0].subscribed, true);
            assert.deepEqual(membersRepositoryStub.update.args[2][0].newsletters, defaultNewsletters);

            // CASE 4: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is empty
            // Member's newsletter subscriptions should not change
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[3][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            assert.equal(membersRepositoryStub.update.args[3][0].email, 'member_subscribed_empty@example.com');
            assert.equal(membersRepositoryStub.update.args[3][0].subscribed, true);
            assert.deepEqual(membersRepositoryStub.update.args[3][0].newsletters, defaultNewsletters);

            // CASE 5: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is invalid
            // Member's newsletter subscriptions should not change
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[4][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            assert.equal(membersRepositoryStub.update.args[4][0].email, 'member_subscribed_invalid@example.com');
            assert.equal(membersRepositoryStub.update.args[4][0].subscribed, true);
            assert.deepEqual(membersRepositoryStub.update.args[4][0].newsletters, defaultNewsletters);

            // CASE 6: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is true
            // Member should remain unsubscribed and not added to any newsletters
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[5][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[5][0].email, 'member_not_subscribed_true@example.com');
            assert.equal(membersRepositoryStub.update.args[5][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[5][0].newsletters, undefined);

            // CASE 7: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is false
            // Member should remain unsubscribed and not added to any newsletters
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[6][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[6][0].email, 'member_not_subscribed_false@example.com');
            assert.equal(membersRepositoryStub.update.args[6][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[6][0].newsletters, undefined);

            // CASE 8: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is NULL
            // Member should remain unsubscribed and not added to any newsletters
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[7][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[7][0].email, 'member_not_subscribed_null@example.com');
            assert.equal(membersRepositoryStub.update.args[7][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[7][0].newsletters, undefined);

            // CASE 9: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is empty
            // Member should remain unsubscribed and not added to any newsletters
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[8][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[8][0].email, 'member_not_subscribed_empty@example.com');
            assert.equal(membersRepositoryStub.update.args[8][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[8][0].newsletters, undefined);

            // CASE 10: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is invalid
            // Member should remain unsubscribed and not added to any newsletters
            assert.deepEqual(Object.keys(membersRepositoryStub.update.args[9][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.update.args[9][0].email, 'member_not_subscribed_invalid@example.com');
            assert.equal(membersRepositoryStub.update.args[9][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[9][0].newsletters, undefined);

            // CASE 11: New member, `subscribed_to_emails` column is true
            // Member should be created and subscribed
            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[0][0].email, 'new_member_true@example.com');
            assert.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            assert.equal(membersRepositoryStub.create.args[0][0].newsletters, undefined);

            // CASE 12: New member, `subscribed_to_emails` column is false
            // Member should be created but not subscribed
            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[1][0].email, 'new_member_false@example.com');
            assert.equal(membersRepositoryStub.create.args[1][0].subscribed, false);
            assert.equal(membersRepositoryStub.create.args[1][0].newsletters, undefined);

            // CASE 13: New member, `subscribed_to_emails` column is NULL
            // Member should be created but not subscribed
            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[2][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[2][0].email, 'new_member_null@example.com');
            assert.equal(membersRepositoryStub.create.args[2][0].subscribed, true);
            assert.equal(membersRepositoryStub.create.args[2][0].newsletters, undefined);

            // CASE 14: New member, `subscribed_to_emails` column is empty
            // Member should be created but not subscribed
            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[3][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[3][0].email, 'new_member_empty@example.com');
            assert.equal(membersRepositoryStub.create.args[3][0].subscribed, true);
            assert.equal(membersRepositoryStub.create.args[3][0].newsletters, undefined);

            // CASE 15: New member, `subscribed_to_emails` column is invalid
            // Member should be created but not subscribed
            assert.deepEqual(Object.keys(membersRepositoryStub.create.args[4][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            assert.equal(membersRepositoryStub.create.args[4][0].email, 'new_member_invalid@example.com');
            assert.equal(membersRepositoryStub.create.args[4][0].subscribed, true);
            assert.equal(membersRepositoryStub.create.args[4][0].newsletters, undefined);
        });
    });

    describe('sendErrorEmail', function () {
        it('should send email with errors for invalid CSV file', async function () {
            const importer = buildMockImporterInstance();

            await importer.sendErrorEmail({
                emailRecipient: 'test@example.com',
                emailSubject: 'Your member import was unsuccessful',
                emailContent: 'Import was unsuccessful',
                errorCSV: 'id,email,invalid email',
                importLabel: {name: 'Test import'}
            });

            sinon.assert.calledWith(sendEmailStub, {
                to: 'test@example.com',
                subject: 'Your member import was unsuccessful',
                html: 'Import was unsuccessful',
                forceTextContent: true,
                attachments: [
                    {
                        filename: 'Test import - Errors.csv',
                        content: 'id,email,invalid email',
                        contentType: 'text/csv',
                        contentDisposition: 'attachment'
                    }
                ]
            });
        });
    });

    describe('prepare', function () {
        it('processes a basic valid import file for members', async function () {
            const membersImporter = buildMockImporterInstance();

            const result = await membersImporter.prepare(`${csvPath}/single-column-with-header.csv`, defaultAllowedFields);

            assert.equal(result.rows.length, 2);
            assert.equal(result.rows[0].email, 'jbloggs@example.com');
            assertExists(result.metadata);
            assert.equal(result.metadata.hasStripeData, false);
        });

        it('Drops columns the caller did not map', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/unmapped-column.csv`, defaultAllowedFields);

            assert.deepEqual(Object.keys(rows[0]), ['email', 'labels']);
        });

        // Anything the caller does map now reaches the rows, including a name the
        // member model knows nothing about. That is deliberate — it is how columns
        // beyond this fixed set will be imported — so the boundary that keeps such a
        // name away from the member record is worth pinning explicitly.
        it('Carries a mapped column the model does not know through to the rows', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/unmapped-column.csv`, {
                email: 'email',
                favourite_colour: 'favourite_colour'
            });

            assert.equal(rows[0].favourite_colour, 'blue');
        });

        it('Does not let an unknown mapped column reach the member record', async function () {
            const importer = buildMockImporterInstance();

            const {rows} = await importer.prepare(`${csvPath}/unmapped-column.csv`, {
                email: 'email',
                favourite_colour: 'favourite_colour'
            });
            await importer.perform(rows);

            assert.equal(membersRepositoryStub.create.args[0][0].favourite_colour, undefined);
        });

        // "subscribed_to_emails" and "subscribed" are one model field, so a mapping
        // naming both leaves one value to be discarded. Left to the parser the winner
        // is whichever column comes last, which flips a member's subscription on
        // column order alone.
        it('Resolves two columns claiming one model field to the first of them', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/duplicate-subscribed-target.csv`, {
                email: 'email',
                first: 'subscribed',
                second: 'subscribed_to_emails'
            });

            assert.equal(rows[0].subscribed, false);
        });

        it('Does not resolve a mapped field name through Object.prototype', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/unmapped-column.csv`, {
                email: 'email',
                favourite_colour: 'toString'
            });

            assert.equal(rows[0].toString, 'blue');
        });

        // Papaparse collects a ragged row's overflow fields under `__parsed_extra`.
        // It is a parser artifact, not a column anyone mapped, and it should not be
        // spooled to disk or carried into the import alongside real values.
        it('Drops the parser artifact a ragged row produces', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/ragged-row.csv`, {
                email: 'email',
                name: 'name'
            });

            assert.deepEqual(Object.keys(rows[0]), ['email', 'name', 'labels']);
        });

        it('Normalises label names given as plain strings', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(
                `${csvPath}/unmapped-column.csv`,
                {email: 'email'},
                ['VIP']
            );

            assert.deepEqual(rows[0].labels, [{name: 'VIP'}]);
        });

        // The member model stamps ids and trims names onto label objects in place, so
        // rows sharing them would leak one row's mutations into the next.
        it('Gives every row its own label objects', async function () {
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(
                `${csvPath}/single-column-with-header.csv`,
                defaultAllowedFields,
                [{name: 'Import 2026-01-01'}]
            );

            assert.equal(rows.length, 2);
            assert.notEqual(rows[0].labels, rows[1].labels, 'rows should not share a labels array');
            assert.notEqual(rows[0].labels[0], rows[1].labels[0], 'rows should not share label objects');

            rows[0].labels[0].id = 'mutated';
            assert.equal(rows[1].labels[0].id, undefined);
        });

        it('It supports "subscribed_to_emails" column header ouf of the box', async function (){
            const membersImporter = buildMockImporterInstance();

            const {rows} = await membersImporter.prepare(`${csvPath}/subscribed-to-emails-header.csv`, defaultAllowedFields);

            // Lands on the member model's field name, not the column's
            assert.deepEqual(Object.keys(rows[0]), ['email', 'subscribed', 'labels']);
        });

        it('checks for stripe data in the imported file', async function () {
            const membersImporter = buildMockImporterInstance();

            const result = await membersImporter.prepare(`${csvPath}/member-csv-export.csv`);

            assertExists(result.metadata);
            assert.equal(result.metadata.hasStripeData, true);
        });
    });

    describe('perform', function () {
        it('performs import on a single csv file', async function () {
            const importer = buildMockImporterInstance();

            const result = await importer.perform(await rowsFor(importer, 'single-column-with-header.csv'));

            assert.equal(membersRepositoryStub.create.args[0][0].email, 'jbloggs@example.com');
            assert.deepEqual(membersRepositoryStub.create.args[0][0].labels, []);

            assert.equal(membersRepositoryStub.create.args[1][0].email, 'test@example.com');
            assert.deepEqual(membersRepositoryStub.create.args[1][0].labels, []);

            assert.equal(result.total, 2);
            assert.equal(result.imported, 2);
            assert.equal(result.errors.length, 0);
        });

        it('performs import on a csv file  "subscribed_to_emails" column header', async function () {
            const importer = buildMockImporterInstance();

            const result = await importer.perform(await rowsFor(importer, 'subscribed-to-emails-header.csv'));

            assert.equal(membersRepositoryStub.create.args[0][0].email, 'jbloggs@example.com');
            assert.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            assert.deepEqual(membersRepositoryStub.create.args[0][0].labels, []);

            assert.equal(membersRepositoryStub.create.args[1][0].email, 'test@example.com');
            assert.equal(membersRepositoryStub.create.args[1][0].subscribed, false);
            assert.deepEqual(membersRepositoryStub.create.args[1][0].labels, []);

            assert.equal(result.total, 2);
            assert.equal(result.imported, 2);
            assert.equal(result.errors.length, 0);
        });

        it('handles various special cases', async function () {
            const importer = buildMockImporterInstance();

            const result = await importer.perform(await rowsFor(importer, 'special-cases.csv'));

            // CASE: Member has created_at in the future
            // The member will not appear in the members list in admin
            // In this case, we should overwrite create_at to current timestamp
            // Refs: https://github.com/TryGhost/Team/issues/2793
            assert.equal(membersRepositoryStub.create.args[0][0].email, 'timetraveler@example.com');
            assert.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            assert.notDeepEqual(membersRepositoryStub.create.args[0][0].created_at, '9999-10-18T06:34:08.000Z');
            assert.equal(membersRepositoryStub.create.args[0][0].created_at <= new Date(), true);

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
        });

        it('searches for stripe customer ID by email when "auto" is passed', async function () {
            const importer = buildMockImporterInstance();

            const result = await importer.perform(await rowsFor(importer, 'auto-stripe-customer-id.csv'));

            assert.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].customer_id, 'cus_mock_123456');

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
        });

        it('respects existing member newsletter subscription preferences', async function () {
            const importer = buildMockImporterInstance();

            const newsletters = [
                {id: 'newsletter_1'},
                {id: 'newsletter_2'}
            ];

            const newslettersCollection = {
                length: newsletters.length,
                toJSON: sinon.stub().returns(newsletters)
            };

            const member = {
                related: sinon.stub()
            };

            member.related.withArgs('labels').returns(null);
            member.related.withArgs('newsletters').returns(newslettersCollection);

            membersRepositoryStub.get = sinon.stub();

            membersRepositoryStub.get
                .withArgs({email: 'jbloggs@example.com'})
                .resolves(member);

            await importer.perform(await rowsFor(importer, 'subscribed-to-emails-header.csv'));

            assert.deepEqual(membersRepositoryStub.update.args[0][0].newsletters, newsletters);
        });

        it('does not overwrite name or note fields for existing members when left blank in the import file', async function () {
            const importer = buildMockImporterInstance();

            const member = {
                name: 'John Bloggs',
                note: 'A note',
                related: sinon.stub()
            };

            member.related.withArgs('labels').returns(null);
            member.related.withArgs('newsletters').returns({length: 0});

            membersRepositoryStub.get = sinon.stub();

            membersRepositoryStub.get
                .withArgs({email: 'test@example.com'})
                .resolves(member);

            await importer.perform(await rowsFor(importer, 'single-column-with-header.csv'));

            assert.equal(membersRepositoryStub.update.args[0][0].name, 'John Bloggs');
            assert.equal(membersRepositoryStub.update.args[0][0].note, 'A note');
        });

        it('does not add subscriptions for existing member when they do not have any subscriptions', async function () {
            const importer = buildMockImporterInstance();

            const member = {
                related: sinon.stub()
            };

            member.related.withArgs('labels').returns(null);
            member.related.withArgs('newsletters').returns({length: 0});

            membersRepositoryStub.get = sinon.stub();

            membersRepositoryStub.get
                .withArgs({email: 'jbloggs@example.com'})
                .resolves(member);

            await importer.perform(await rowsFor(importer, 'subscribed-to-emails-header.csv'));

            assert.deepEqual(membersRepositoryStub.update.args[0][0].subscribed, false);
        });

        it('removes existing member newsletter subscriptions when set to not be subscribed', async function () {
            const importer = buildMockImporterInstance();

            const newsletters = [
                {id: 'newsletter_1'},
                {id: 'newsletter_2'}
            ];

            const newslettersCollection = {
                length: newsletters.length,
                toJSON: sinon.stub().returns(newsletters)
            };

            const member = {
                related: sinon.stub()
            };

            member.related.withArgs('labels').returns(null);
            member.related.withArgs('newsletters').returns(newslettersCollection);

            membersRepositoryStub.get = sinon.stub();

            membersRepositoryStub.get
                .withArgs({email: 'test@example.com'})
                .resolves(member);

            await importer.perform(await rowsFor(importer, 'subscribed-to-emails-header.csv'));

            assert.equal(membersRepositoryStub.update.args[0][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[0][0].newsletters, undefined);
        });

        it('does not import a free member with an import tier', async function () {
            const tier = {
                id: {
                    toString: () => 'abc123'
                },
                name: 'Premium Tier'
            };
            const getTierByNameStub = sinon.stub();

            getTierByNameStub.withArgs(tier.name).resolves(tier);

            const importer = buildMockImporterInstance({
                getTierByName: getTierByNameStub
            });

            const result = await importer.perform(await rowsFor(importer, 'free-member-import-tier.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'You cannot import a free member with a specified tier.');
        });

        it('imports a comped member with an import tier', async function () {
            const tier = {
                id: {
                    toString: () => 'abc123'
                },
                name: 'Premium Tier'
            };
            const getTierByNameStub = sinon.stub();

            getTierByNameStub.withArgs(tier.name).resolves(tier);

            const importer = buildMockImporterInstance({
                getTierByName: getTierByNameStub
            });

            const result = await importer.perform(await rowsFor(importer, 'comped-member-import-tier.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            sinon.assert.calledOnce(membersRepositoryStub.update);
            assert.deepEqual(
                membersRepositoryStub.update.getCall(0).args[0],
                {products: [{id: tier.id.toString()}]}
            );
        });

        it('does not import a comped member with an invalid import tier', async function () {
            const tier = {
                id: {
                    toString: () => 'abc123'
                },
                name: 'Premium Tier'
            };
            const getTierByNameStub = sinon.stub();

            getTierByNameStub.withArgs(tier.name).resolves(tier);

            const importer = buildMockImporterInstance({
                getTierByName: getTierByNameStub
            });

            const result = await importer.perform(await rowsFor(importer, 'comped-member-invalid-import-tier.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, '"Invalid Tier" is not a valid tier.');
        });

        it('reassigns an orphaned gift to the imported member', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().resolves({})
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            sinon.assert.calledOnce(giftServiceStub.reassignRedeemer);
            const [giftId, memberId] = giftServiceStub.reassignRedeemer.getCall(0).args;
            assert.equal(giftId, 'abc123abc123abc123abc123');
            assert.equal(memberId, 'test_member_id');
        });

        it('rejects a row that specifies both gift_id and import_tier', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().resolves({})
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign-with-tier.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: Cannot specify both gift_id and import_tier.');
            sinon.assert.notCalled(giftServiceStub.reassignRedeemer);
        });

        it('rejects a row that specifies both gift_id and complimentary_plan', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().resolves({})
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign-with-complimentary.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: Cannot specify both gift_id and complimentary_plan.');
            sinon.assert.notCalled(giftServiceStub.reassignRedeemer);
        });

        it('surfaces NotFoundError from GiftService as a row error', async function () {
            const NotFoundError = class extends Error {
                constructor(message) {
                    super(message);
                    this.errorType = 'NotFoundError';
                }
            };
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().rejects(new NotFoundError('This gift does not exist.'))
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: This gift does not exist.');
        });

        it('surfaces already-assigned error from GiftService as a row error', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().rejects(new Error('This gift is already assigned to another member.'))
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: This gift is already assigned to another member.');
        });

        it('surfaces not-reassignable error from GiftService as a row error', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().rejects(new Error('This gift does not have a reassignable status.'))
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: This gift does not have a reassignable status.');
        });

        it('surfaces existing-gift conflict from GiftService as a row error', async function () {
            const giftServiceStub = {
                reassignRedeemer: sinon.stub().rejects(new Error('Member already has a different active gift attached.'))
            };
            const importer = buildMockImporterInstance({
                getGiftService: async () => giftServiceStub
            });

            const result = await importer.perform(await rowsFor(importer, 'gift-member-reassign.csv'));

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, 'Member cannot be assigned to a gift: Member already has a different active gift attached.');
        });

        it('imports a paid member with an import tier', async function () {
            const tier = {
                id: {
                    toString: () => 'abc123'
                },
                name: 'Premium Tier'
            };
            const getTierByNameStub = sinon.stub();

            getTierByNameStub.withArgs(tier.name).resolves(tier);

            const importer = buildMockImporterInstance({
                getTierByName: getTierByNameStub
            });

            const result = await importer.perform(await rowsFor(importer, 'paid-member-import-tier.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            sinon.assert.calledOnce(stripeUtilsStub.forceStripeSubscriptionToProduct);
            assert.deepEqual(
                stripeUtilsStub.forceStripeSubscriptionToProduct.getCall(0).args[0],
                {
                    customer_id: 'cus_MdR9tqW6bAreiq',
                    product_id: tier.id.toString()
                }
            );
        });

        it('archives any Stripe prices created due to an import tier being specified', async function () {
            const tier = {
                id: {
                    toString: () => 'abc123'
                },
                name: 'Premium Tier'
            };
            const getTierByNameStub = sinon.stub();

            getTierByNameStub.withArgs(tier.name).resolves(tier);

            const newStripePriceId = 'price_123';

            const importer = buildMockImporterInstance({
                getTierByName: getTierByNameStub
            });

            stripeUtilsStub.forceStripeSubscriptionToProduct.resolves({
                isNewStripePrice: true,
                stripePriceId: newStripePriceId
            });

            const result = await importer.perform(await rowsFor(importer, 'paid-member-import-tier.csv'));

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            sinon.assert.calledOnce(stripeUtilsStub.archivePrice);
            sinon.assert.calledWith(stripeUtilsStub.archivePrice, newStripePriceId);
        });
    });
});
