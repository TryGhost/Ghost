const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Integration} = require('../../../../core/server/models/integration');
const Base = require('../../../../core/server/models/base');
const {knex} = require('../../../../core/server/data/db');

describe('Unit: models/integration', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('permittedOptions', function () {
        let basePermittedOptionsReturnVal;

        beforeEach(function () {
            basePermittedOptionsReturnVal = ['super', 'doopa'];
            sinon.stub(Base.Model, 'permittedOptions')
                .returns(basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result', function () {
            const returnedOptions = Integration.permittedOptions();
            assert.deepEqual(returnedOptions, basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result plus "filter" when methodName is findOne', function () {
            const returnedOptions = Integration.permittedOptions('findOne');
            assert.deepEqual(returnedOptions, basePermittedOptionsReturnVal.concat('filter'));
        });
    });

    describe('findOne', function () {
        const mockDb = require('../../../utils/mock-knex');
        let tracker;

        beforeAll(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
        });

        afterAll(function () {
            mockDb.unmock(knex);
        });

        it('generates correct query (allows use of options.filter)', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return Integration.findOne({
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

    describe('getApiKeyBySlug', function () {
        const mockDb = require('../../../utils/mock-knex');
        let tracker;

        beforeAll(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
        });

        afterAll(function () {
            mockDb.unmock(knex);
        });

        it('returns the matching API key as a flat DTO', async function () {
            const queries = [];
            tracker.install();
            tracker.on('query', (query) => {
                queries.push(query);
                query.response([{id: 'key-admin', secret: 'admin-secret'}]);
            });

            const apiKey = await Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
            assert.deepEqual(apiKey, {id: 'key-admin', secret: 'admin-secret'});
            assert.equal(queries.length, 1);
            assert.equal(queries[0].sql, 'select `api_keys`.`id`, `api_keys`.`secret` from `api_keys` inner join `integrations` on `api_keys`.`integration_id` = `integrations`.`id` where `integrations`.`slug` = ? and `api_keys`.`type` = ? limit ?');
            assert.deepEqual(queries[0].bindings, ['ghost-scheduler', 'admin', 1]);
        });

        it('throws NotFoundError when no matching key exists', async function () {
            tracker.install();
            tracker.on('query', (query) => {
                query.response([]);
            });

            const errors = require('@tryghost/errors');
            await assert.rejects(
                Integration.getApiKeyBySlug('ghost-scheduler', 'admin'),
                err => err instanceof errors.NotFoundError
            );
        });
    });
});
