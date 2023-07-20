// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const Tier = require('@tryghost/tiers/lib/Tier');
const ObjectID = require('bson-objectid').default;
const assert = require('assert/strict');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const MembersCSVImporter = require('..');

const csvPath = path.join(__dirname, '/fixtures/');

describe('Importer', function () {
    let fsWriteSpy;
    let memberCreateStub;
    let knexStub;
    let sendEmailStub;
    let membersRepositoryStub;
    let defaultTierId;

    const defaultAllowedFields = {
        email: 'email',
        name: 'name',
        note: 'note',
        subscribed_to_emails: 'subscribed',
        created_at: 'created_at',
        complimentary_plan: 'complimentary_plan',
        stripe_customer_id: 'stripe_customer_id',
        labels: 'labels'
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

    const buildMockImporterInstance = () => {
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
            context: {importer: true}
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
            result.filePath.should.match(/\/members-importer\/test\/fixtures\/Members Import/);

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

            const result = await importer.perform(`${csvPath}/single-column-with-header.csv`, defaultAllowedFields);

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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`, defaultAllowedFields);

            assert.deepEqual(membersRepositoryStub.update.args[0][0].newsletters, newsletters);
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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`, defaultAllowedFields);

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

            await importer.perform(`${csvPath}/subscribed-to-emails-header.csv`, defaultAllowedFields);

            assert.equal(membersRepositoryStub.update.args[0][0].subscribed, false);
            assert.equal(membersRepositoryStub.update.args[0][0].newsletters, undefined);
        });
    });
});
