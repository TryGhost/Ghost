const assert = require('node:assert/strict');
const sinon = require('sinon');
const cleanTokens = require('../../../../../core/server/services/members/jobs/lib/clean-tokens');

describe('Job lib: cleanTokens', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('deletes tokens created more than 24 hours ago and returns the count', async function () {
        const query = {
            where: sinon.stub().returnsThis(),
            delete: sinon.stub().resolves(7)
        };
        const db = {knex: sinon.stub().returns(query)};

        const deleted = await cleanTokens(db);

        assert.equal(deleted, 7);
        sinon.assert.calledOnceWithExactly(db.knex, 'tokens');
        const [column, operator] = query.where.firstCall.args;
        assert.equal(column, 'created_at');
        assert.equal(operator, '<');
    });
});
