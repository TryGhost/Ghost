// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const MembersCSVImporter = require('..');

const csvPath = path.join(__dirname, '/fixtures/');

describe('Importer', function () {
    let fsWriteSpy;

    beforeEach(function () {
        fsWriteSpy = sinon.spy(fs, 'writeFile');
    });

    afterEach(function () {
        const writtenFile = fsWriteSpy.args[0][0];

        if (writtenFile) {
            fs.removeSync(writtenFile);
        }

        sinon.restore();
    });

    describe('process', function () {
        it('should import a CSV file', async function () {
            const defaultProduct = {
                id: 'default_product_id'
            };

            const membersApi = {
                productRepository: {
                    list: async () => {
                        return {
                            data: [defaultProduct]
                        };
                    }
                },
                members: {
                    get: async () => {
                        return null;
                    },
                    create: async (row) => {
                        return row;
                    }
                }
            };

            const knexStub = {
                transaction: sinon.stub().resolves({
                    rollback: () => {},
                    commit: () => {}
                })
            };

            const LabelModelStub = {
                findOne: sinon.stub().resolves(null)
            };

            const importer = new MembersCSVImporter({
                storagePath: csvPath,
                getTimezone: sinon.stub().returns('UTC'),
                getMembersApi: () => membersApi,
                sendEmail: sinon.stub(),
                isSet: sinon.stub(),
                addJob: sinon.stub(),
                knex: knexStub,
                urlFor: sinon.stub()
            });

            const result = await importer.process({
                pathToCSV: `${csvPath}/single-column-with-header.csv`,
                headerMapping: {},
                importLabel: {
                    name: 'test import'
                },
                user: {
                    email: 'test@example.com'
                },
                LabelModel: LabelModelStub
            });

            should.exist(result.meta);
            should.exist(result.meta.stats);
            should.exist(result.meta.stats.imported);
            result.meta.stats.imported.should.equal(2);

            should.exist(result.meta.stats.invalid);
            should.equal(result.meta.import_label, null);

            fsWriteSpy.calledOnce.should.be.true();
        });
    });

    describe('prepare', function () {
        it('processes a basic valid import file for members', async function () {
            const membersImporter = new MembersCSVImporter({
                storagePath: csvPath,
                getTimezone: sinon.stub().returns('UTC'),
                getMembersApi: sinon.stub(),
                sendEmail: sinon.stub(),
                isSet: sinon.stub(),
                addJob: sinon.stub(),
                knex: sinon.stub(),
                urlFor: sinon.stub()
            });

            const result = await membersImporter.prepare(`${csvPath}/single-column-with-header.csv`);

            should.exist(result.id);
            result.id.should.match(/\/members-importer\/test\/fixtures\/Members Import/);

            result.batches.should.equal(2);
            should.exist(result.metadata);

            fsWriteSpy.calledOnce.should.be.true();
        });
    });
});
