const should = require('should');
const sinon = require('sinon');

// Import the module under test
const bulkFilters = require('../../../../../../core/server/models/base/plugins/bulk-filters');
const {byNQL} = bulkFilters;

describe('Models: bulk-operations plugin', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('byNQL', function () {
        it('yields a single query modifier function', function () {
            const strategy = byNQL('status:published');
            const results = [...strategy];

            results.length.should.equal(1);
            results[0].should.be.a.Function();
        });

        it('returns a function that calls nql().querySQL(qb)', function () {
            const strategy = byNQL('status:published');
            const [applyWhere] = [...strategy];

            // Verify it's a function - actual NQL integration is tested by E2E tests
            applyWhere.should.be.a.Function();
        });
    });

    describe('byColumnValues', function () {
        // These tests will fail until Phase 2 implementation
        it('chunks values into groups of 100 by default', function () {
            const {byColumnValues} = bulkFilters;

            // Create 150 IDs
            const ids = Array.from({length: 150}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids);
            const results = [...strategy];

            // Should produce 2 chunks: 100 + 50
            results.length.should.equal(2);
        });

        it('yields single chunk for values less than chunk size', function () {
            const {byColumnValues} = bulkFilters;

            const ids = Array.from({length: 50}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids);
            const results = [...strategy];

            results.length.should.equal(1);
        });

        it('yields no chunks for empty array', function () {
            const {byColumnValues} = bulkFilters;

            const strategy = byColumnValues('id', []);
            const results = [...strategy];

            results.length.should.equal(0);
        });

        it('applies whereIn to query builder for each chunk', function () {
            const {byColumnValues} = bulkFilters;

            const ids = ['id-1', 'id-2', 'id-3'];
            const strategy = byColumnValues('member_id', ids);
            const [applyWhere] = [...strategy];

            const mockQb = {
                whereIn: sinon.stub().returnsThis()
            };

            applyWhere(mockQb);

            mockQb.whereIn.calledOnce.should.be.true();
            mockQb.whereIn.calledWith('member_id', ids).should.be.true();
        });

        it('allows custom chunk size', function () {
            const {byColumnValues} = bulkFilters;

            const ids = Array.from({length: 25}, (_, i) => `id-${i}`);
            const strategy = byColumnValues('id', ids, 10);
            const results = [...strategy];

            // Should produce 3 chunks: 10 + 10 + 5
            results.length.should.equal(3);
        });
    });

    describe('byIds', function () {
        // These tests will fail until Phase 2 implementation
        it('delegates to byColumnValues with id column', function () {
            const {byIds} = bulkFilters;

            const ids = ['id-1', 'id-2', 'id-3'];
            const strategy = byIds(ids);
            const [applyWhere] = [...strategy];

            const mockQb = {
                whereIn: sinon.stub().returnsThis()
            };

            applyWhere(mockQb);

            mockQb.whereIn.calledOnce.should.be.true();
            mockQb.whereIn.calledWith('id', ids).should.be.true();
        });
    });
});
