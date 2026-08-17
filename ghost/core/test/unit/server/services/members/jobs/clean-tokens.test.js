const assert = require('node:assert/strict');
const sinon = require('sinon');
const cleanTokens = require('../../../../../../core/server/services/members/jobs/clean-tokens-task').default;

describe('clean-tokens job', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('cleanTokens task', function () {
        it('deletes tokens created more than 24 hours ago', async function () {
            let capturedWhere;
            const deleteStub = sinon.stub().resolves(3);
            const knex = sinon.stub().callsFake((table) => {
                assert.equal(table, 'tokens');
                return {
                    where: (...args) => {
                        capturedWhere = args;
                        return {delete: deleteStub};
                    }
                };
            });

            const deleted = await cleanTokens({db: {knex}});

            assert.equal(capturedWhere[0], 'created_at');
            assert.equal(capturedWhere[1], '<');
            assert.match(capturedWhere[2], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
            assert.equal(deleted, 3);
        });
    });
});
