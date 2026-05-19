const assert = require('node:assert/strict');
const sinon = require('sinon');
const bulkFilters = require('../../../../../core/server/models/base/plugins/bulk-filters');
const {byNQL, byColumnValues, byIds} = bulkFilters;

describe('Models: bulk-filters', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('byNQL', function () {
        it('yields a single query modifier function', function () {
            const strategy = byNQL('status:published');
            const results = [...strategy];

            assert.equal(results.length, 1);
            assert.equal(typeof results[0], 'function');
        });
    });

    describe('byColumnValues', function () {
        it('chunks values into groups of 100 by default', function () {
            const ids = Array.from({length: 150}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids);
            const results = [...strategy];

            // Should produce 2 chunks: 100 + 50
            assert.equal(results.length, 2);
        });

        it('yields single chunk for values less than chunk size', function () {
            const ids = Array.from({length: 50}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids);
            const results = [...strategy];

            assert.equal(results.length, 1);
        });

        it('yields no chunks for empty array', function () {
            const strategy = byColumnValues('id', []);
            const results = [...strategy];

            assert.equal(results.length, 0);
        });

        it('applies whereIn to query builder for each chunk', function () {
            const ids = ['id-1', 'id-2', 'id-3'];
            const strategy = byColumnValues('member_id', ids);
            const [applyWhere] = [...strategy];

            const mockQb = {
                whereIn: sinon.stub().returnsThis()
            };

            applyWhere(mockQb);

            sinon.assert.calledOnce(mockQb.whereIn);
            sinon.assert.calledWith(mockQb.whereIn, 'member_id', ids);
        });

        it('allows custom chunk size', function () {
            const ids = Array.from({length: 25}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids, 10);
            const results = [...strategy];

            // Should produce 3 chunks: 10 + 10 + 5
            assert.equal(results.length, 3);
        });
    });

    describe('byIds', function () {
        it('delegates to byColumnValues with id column', function () {
            const ids = ['id-1', 'id-2', 'id-3'];
            const strategy = byIds(ids);
            const [applyWhere] = [...strategy];

            const mockQb = {
                whereIn: sinon.stub().returnsThis()
            };

            applyWhere(mockQb);

            sinon.assert.calledOnce(mockQb.whereIn);
            sinon.assert.calledWith(mockQb.whereIn, 'id', ids);
        });
    });
});
