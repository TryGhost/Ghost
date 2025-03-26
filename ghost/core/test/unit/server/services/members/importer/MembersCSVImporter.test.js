require('should');

const Tier = require('@tryghost/tiers/lib/Tier');
const ObjectID = require('bson-objectid').default;
const assert = require('assert/strict');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const MembersCSVImporter = require('../../../../../../core/server/services/members/importer/MembersCSVImporter');

const csvPath = path.join(__dirname, '/fixtures/');

describe('MembersCSVImporter', function () {
    let fsWriteSpy;
    let memberCreateStub;
    let knexStub;
    let sendEmailStub;
    let membersRepositoryStub;
    let stripeUtilsStub;
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

    beforeEach(function () {
        fsWriteSpy = sinon.spy(fs, 'writeFile');
    });

    afterEach(function () {
        const writtenFile = fsWriteSpy.args?.[0]?.[0];

        if (writtenFile) {
            fs.removeSync(writtenFile);
        }

        sinon.restore();
    });

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
        knexStub = {
            transaction: sinon.stub().resolves({
                rollback: () => {},
                commit: () => {}
            })
        };
        sendEmailStub = sinon.stub();
        stripeUtilsStub = {
            forceStripeSubscriptionToProduct: sinon.stub().resolves({}),
            archivePrice: sinon.stub().resolves()
        };

        return new MembersCSVImporter({
            storagePath: csvPath,
            getTimezone: sinon.stub().returns('UTC'),
            getMembersRepository: () => {
                return membersRepositoryStub;
            },
            getDefaultTier: () => {
                return defaultTierDummy;
            },
            sendEmail: sendEmailStub,
            isSet: sinon.stub(),
            addJob: sinon.stub(),
            knex: knexStub,
            urlFor: sinon.stub(),
            context: {importer: true},
            stripeUtils: stripeUtilsStub,
            ...deps
        });
    };

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

            should.exist(result.meta);
            should.exist(result.meta.stats);
            should.exist(result.meta.stats.imported);
            result.meta.stats.imported.should.equal(2);

            should.exist(result.meta.stats.invalid);
            should.equal(result.meta.import_label, null);

            should.exist(result.meta.originalImportSize);
            result.meta.originalImportSize.should.equal(2);

            fsWriteSpy.calledOnce.should.be.true();

            // Called at least once
            memberCreateStub.notCalled.should.be.false();
            memberCreateStub.firstCall.lastArg.context.import.should.be.true();
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

            should.exist(result.meta);
            should.exist(result.meta.stats);
            should.exist(result.meta.stats.imported);
            result.meta.stats.imported.should.equal(2);

            should.exist(result.meta.stats.invalid);
            should.deepEqual(result.meta.import_label, internalLabel);

            should.exist(result.meta.originalImportSize);
            result.meta.originalImportSize.should.equal(2);

            fsWriteSpy.calledOnce.should.be.true();

            // member records get inserted
            membersRepositoryStub.create.calledTwice.should.be.true();

            should.equal(membersRepositoryStub.create.args[0][1].context.import, true, 'inserts are done in the "import" context');

            should.deepEqual(Object.keys(membersRepositoryStub.create.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[0][0].id, undefined, 'id field should not be taken from the user input');
            should.equal(membersRepositoryStub.create.args[0][0].email, 'member_complimentary_test@example.com');
            should.equal(membersRepositoryStub.create.args[0][0].name, 'bobby tables');
            should.equal(membersRepositoryStub.create.args[0][0].note, 'a note');
            should.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            should.equal(membersRepositoryStub.create.args[0][0].created_at, '2022-10-18T06:34:08.000Z');
            should.equal(membersRepositoryStub.create.args[0][0].deleted_at, undefined, 'deleted_at field should not be taken from the user input');
            should.deepEqual(membersRepositoryStub.create.args[0][0].labels, [{
                name: 'user import label'
            }]);

            should.deepEqual(Object.keys(membersRepositoryStub.create.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[1][0].id, undefined, 'id field should not be taken from the user input');
            should.equal(membersRepositoryStub.create.args[1][0].email, 'member_stripe_test@example.com');
            should.equal(membersRepositoryStub.create.args[1][0].name, 'stirpey beaver');
            should.equal(membersRepositoryStub.create.args[1][0].note, 'testing notes');
            should.equal(membersRepositoryStub.create.args[1][0].subscribed, false);
            should.equal(membersRepositoryStub.create.args[1][0].created_at, '2022-10-18T07:31:57.000Z');
            should.equal(membersRepositoryStub.create.args[1][0].deleted_at, undefined, 'deleted_at field should not be taken from the user input');
            should.deepEqual(membersRepositoryStub.create.args[1][0].labels, [], 'no labels should be assigned');

            // stripe customer import
            membersRepositoryStub.linkStripeCustomer.calledOnce.should.be.true();
            should.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].customer_id, 'cus_MdR9tqW6bAreiq');
            should.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].member_id, 'test_member_id');

            // complimentary_plan import
            membersRepositoryStub.update.calledOnce.should.be.true();
            should.deepEqual(membersRepositoryStub.update.args[0][0].products, [{
                id: defaultTierId.toString()
            }]);
            should.deepEqual(membersRepositoryStub.update.args[0][1].id, 'test_member_id');
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

            should.exist(result.meta);
            should.exist(result.meta.stats);
            should.exist(result.meta.stats.imported);
            result.meta.stats.imported.should.equal(5);

            should.exist(result.meta.stats.invalid);
            should.deepEqual(result.meta.import_label, internalLabel);

            should.exist(result.meta.originalImportSize);
            result.meta.originalImportSize.should.equal(15);

            fsWriteSpy.calledOnce.should.be.true();

            // member records get inserted
            should.equal(membersRepositoryStub.create.callCount, 5);

            should.equal(membersRepositoryStub.create.args[0][1].context.import, true, 'inserts are done in the "import" context');

            // CASE 1: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is true
            // Member's newsletter subscriptions should not change
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            should.equal(membersRepositoryStub.update.args[0][0].email, 'member_subscribed_true@example.com');
            should.equal(membersRepositoryStub.update.args[0][0].subscribed, true);
            should.deepEqual(membersRepositoryStub.update.args[0][0].newsletters, defaultNewsletters);

            // CASE 2: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is false
            // Member's newsletter subscriptions should be removed
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[1][0].email, 'member_subscribed_false@example.com');
            should.equal(membersRepositoryStub.update.args[1][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[1][0].newsletters, undefined);

            // CASE 3: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is NULL
            // Member's newsletter subscriptions should not change
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[2][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            should.equal(membersRepositoryStub.update.args[2][0].email, 'member_subscribed_null@example.com');
            should.equal(membersRepositoryStub.update.args[2][0].subscribed, true);
            should.deepEqual(membersRepositoryStub.update.args[2][0].newsletters, defaultNewsletters);

            // CASE 4: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is empty
            // Member's newsletter subscriptions should not change
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[3][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            should.equal(membersRepositoryStub.update.args[3][0].email, 'member_subscribed_empty@example.com');
            should.equal(membersRepositoryStub.update.args[3][0].subscribed, true);
            should.deepEqual(membersRepositoryStub.update.args[3][0].newsletters, defaultNewsletters);

            // CASE 5: Existing member with at least one newsletter subscription, `subscribed_to_emails` column is invalid
            // Member's newsletter subscriptions should not change
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[4][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels', 'newsletters']);
            should.equal(membersRepositoryStub.update.args[4][0].email, 'member_subscribed_invalid@example.com');
            should.equal(membersRepositoryStub.update.args[4][0].subscribed, true);
            should.deepEqual(membersRepositoryStub.update.args[4][0].newsletters, defaultNewsletters);

            // CASE 6: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is true
            // Member should remain unsubscribed and not added to any newsletters
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[5][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[5][0].email, 'member_not_subscribed_true@example.com');
            should.equal(membersRepositoryStub.update.args[5][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[5][0].newsletters, undefined);

            // CASE 7: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is false
            // Member should remain unsubscribed and not added to any newsletters
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[6][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[6][0].email, 'member_not_subscribed_false@example.com');
            should.equal(membersRepositoryStub.update.args[6][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[6][0].newsletters, undefined);

            // CASE 8: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is NULL
            // Member should remain unsubscribed and not added to any newsletters
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[7][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[7][0].email, 'member_not_subscribed_null@example.com');
            should.equal(membersRepositoryStub.update.args[7][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[7][0].newsletters, undefined);

            // CASE 9: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is empty
            // Member should remain unsubscribed and not added to any newsletters
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[8][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[8][0].email, 'member_not_subscribed_empty@example.com');
            should.equal(membersRepositoryStub.update.args[8][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[8][0].newsletters, undefined);

            // CASE 10: Existing member with no newsletter subscriptions, `subscribed_to_emails` column is invalid
            // Member should remain unsubscribed and not added to any newsletters
            should.deepEqual(Object.keys(membersRepositoryStub.update.args[9][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.update.args[9][0].email, 'member_not_subscribed_invalid@example.com');
            should.equal(membersRepositoryStub.update.args[9][0].subscribed, false);
            should.equal(membersRepositoryStub.update.args[9][0].newsletters, undefined);

            // CASE 11: New member, `subscribed_to_emails` column is true
            // Member should be created and subscribed
            should.deepEqual(Object.keys(membersRepositoryStub.create.args[0][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[0][0].email, 'new_member_true@example.com');
            should.equal(membersRepositoryStub.create.args[0][0].subscribed, true);
            should.equal(membersRepositoryStub.create.args[0][0].newsletters, undefined);

            // CASE 12: New member, `subscribed_to_emails` column is false
            // Member should be created but not subscribed
            should.deepEqual(Object.keys(membersRepositoryStub.create.args[1][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[1][0].email, 'new_member_false@example.com');
            should.equal(membersRepositoryStub.create.args[1][0].subscribed, false);
            should.equal(membersRepositoryStub.create.args[1][0].newsletters, undefined);

            // CASE 13: New member, `subscribed_to_emails` column is NULL
            // Member should be created but not subscribed
            should.deepEqual(Object.keys(membersRepositoryStub.create.args[2][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[2][0].email, 'new_member_null@example.com');
            should.equal(membersRepositoryStub.create.args[2][0].subscribed, true);
            should.equal(membersRepositoryStub.create.args[2][0].newsletters, undefined);

            // CASE 14: New member, `subscribed_to_emails` column is empty
            // Member should be created but not subscribed
            should.deepEqual(Object.keys(membersRepositoryStub.create.args[3][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[3][0].email, 'new_member_empty@example.com');
            should.equal(membersRepositoryStub.create.args[3][0].subscribed, true);
            should.equal(membersRepositoryStub.create.args[3][0].newsletters, undefined);

            // CASE 15: New member, `subscribed_to_emails` column is invalid
            // Member should be created but not subscribed
            should.deepEqual(Object.keys(membersRepositoryStub.create.args[4][0]), ['email', 'name', 'note', 'subscribed', 'created_at', 'labels']);
            should.equal(membersRepositoryStub.create.args[4][0].email, 'new_member_invalid@example.com');
            should.equal(membersRepositoryStub.create.args[4][0].subscribed, true);
            should.equal(membersRepositoryStub.create.args[4][0].newsletters, undefined);
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

            sendEmailStub.calledWith({
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
            }).should.be.true();
        });
    });

    describe('prepare', function () {
        it('processes a basic valid import file for members', async function () {
            const membersImporter = buildMockImporterInstance();

            const result = await membersImporter.prepare(`${csvPath}/single-column-with-header.csv`, defaultAllowedFields);

            should.exist(result.filePath);
            result.filePath.should.match(/\/members\/importer\/fixtures\/Members Import/);

            result.batches.should.equal(2);
            should.exist(result.metadata);
            should.equal(result.metadata.hasStripeData, false);
            fsWriteSpy.calledOnce.should.be.true();
        });

        it('Does not include columns not in the original CSV or mapped', async function () {
            const membersImporter = buildMockImporterInstance();

            await membersImporter.prepare(`${csvPath}/single-column-with-header.csv`, defaultAllowedFields);

            const fileContents = fsWriteSpy.firstCall.args[1];

            fileContents.should.match(/^email,labels\r\n/);
        });

        it('It supports "subscribed_to_emails" column header ouf of the box', async function (){
            const membersImporter = buildMockImporterInstance();

            await membersImporter.prepare(`${csvPath}/subscribed-to-emails-header.csv`, defaultAllowedFields);

            const fileContents = fsWriteSpy.firstCall.args[1];

            fileContents.should.match(/^email,subscribed_to_emails,labels\r\n/);
        });

        it('checks for stripe data in the imported file', async function () {
            const membersImporter = buildMockImporterInstance();

            const result = await membersImporter.prepare(`${csvPath}/member-csv-export.csv`);

            should.exist(result.metadata);
            should.equal(result.metadata.hasStripeData, true);
        });
    });

    describe('perform', function () {
        it('performs import on a single csv file', async function () {
            const importer = buildMockImporterInstance();

            const result = await importer.perform(`${csvPath}/single-column-with-header.csv`);

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

            const result = await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`);

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

            const result = await importer.perform(`${csvPath}/special-cases.csv`);

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

            const result = await importer.perform(`${csvPath}/auto-stripe-customer-id.csv`);

            should.equal(membersRepositoryStub.linkStripeCustomer.args[0][0].customer_id, 'cus_mock_123456');

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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`);

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

            await importer.perform(`${csvPath}/single-column-with-header.csv`);

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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`);

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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`);

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

            const result = await importer.perform(`${csvPath}/free-member-import-tier.csv`);

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

            const result = await importer.perform(`${csvPath}/comped-member-import-tier.csv`);

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            assert.ok(membersRepositoryStub.update.calledOnce);
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

            const result = await importer.perform(`${csvPath}/comped-member-invalid-import-tier.csv`);

            assert.equal(result.total, 1);
            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].error, '"Invalid Tier" is not a valid tier.');
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

            const result = await importer.perform(`${csvPath}/paid-member-import-tier.csv`);

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            assert.ok(stripeUtilsStub.forceStripeSubscriptionToProduct.calledOnce);
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

            const result = await importer.perform(`${csvPath}/paid-member-import-tier.csv`);

            assert.equal(result.total, 1);
            assert.equal(result.imported, 1);
            assert.equal(result.errors.length, 0);
            assert.ok(stripeUtilsStub.archivePrice.calledOnce);
            assert.ok(stripeUtilsStub.archivePrice.calledWith(newStripePriceId));
        });
    });
});
