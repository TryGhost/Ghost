const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const {knex} = require('../../../../core/server/data/db');

describe('Unit: models/integration', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('permittedOptions', function () {
        let basePermittedOptionsReturnVal;

        beforeEach(function () {
            basePermittedOptionsReturnVal = ['super', 'doopa'];
            sinon.stub(models.Base.Model, 'permittedOptions')
                .returns(basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result', function () {
            const returnedOptions = models.Integration.permittedOptions();
            assert.deepEqual(returnedOptions, basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result plus "filter" when methodName is findOne', function () {
            const returnedOptions = models.Integration.permittedOptions('findOne');
            assert.deepEqual(returnedOptions, basePermittedOptionsReturnVal.concat('filter'));
        });
    });

    describe('findOne', function () {
        const mockDb = require('mock-knex');
        let tracker;

        before(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
        });

        after(function () {
            mockDb.unmock(knex);
        });

        it('generates correct query (allows use of options.filter)', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Integration.findOne({
                id: '123'
            }, {
                filter: 'type:[custom,builtin,core]'
            }).then(() => {
                assert.equal(queries.length, 1);
                assert.equal(queries[0].sql, 'select `integrations`.* from `integrations` where `integrations`.`type` in (?, ?, ?) and `integrations`.`id` = ? limit ?');
                assert.deepEqual(queries[0].bindings, ['custom', 'builtin', 'core', '123', 1]);
            });
        });
    });

    describe('getInternalFrontendKey', function () {
        const mockDb = require('mock-knex');
        let tracker;

        before(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
        });

        after(function () {
            mockDb.unmock(knex);
        });

        it('generates correct query', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Integration.getInternalFrontendKey().then(() => {
                assert.equal(queries.length, 1);
                assert.equal(queries[0].sql, 'select `integrations`.* from `integrations` where `integrations`.`slug` = ? limit ?');
                assert.deepEqual(queries[0].bindings, ['ghost-internal-frontend', 1]);
            });
        });
    });
});
