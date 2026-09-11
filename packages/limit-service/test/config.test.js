require('./utils');
const assert = require('node:assert').strict;
const sinon = require('sinon');
const config = require('../lib/config');

describe('Config', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createMockKnex(options = {}) {
        const chain = {
            count: sinon.stub().returnsThis(),
            sum: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            first: sinon.stub().resolves(options.firstResult || {count: 0}),
            select: sinon.stub().returnsThis(),
            leftJoin: sinon.stub().returnsThis(),
            whereNot: sinon.stub().returnsThis(),
            andWhereNot: sinon.stub().returnsThis(),
            union: sinon.stub().resolves(options.unionResult || [])
        };
        return sinon.stub().returns(chain);
    }

    describe('members', function () {
        it('queries the members table and returns count', async function () {
            const knex = createMockKnex({firstResult: {count: 42}});
            const result = await config.members.currentCountQuery(knex);

            assert.equal(result, 42);
            sinon.assert.calledWith(knex, 'members');
        });
    });

    describe('newsletters', function () {
        it('queries active newsletters and returns count', async function () {
            const knex = createMockKnex({firstResult: {count: 7}});
            const result = await config.newsletters.currentCountQuery(knex);

            assert.equal(result, 7);
            sinon.assert.calledWith(knex, 'newsletters');
        });
    });

    describe('emails', function () {
        it('queries emails since start date and returns sum', async function () {
            const knex = createMockKnex({firstResult: {count: 500}});
            const startDate = '2021-01-01T00:00:00Z';
            const result = await config.emails.currentCountQuery(knex, startDate);

            assert.equal(result, 500);
            sinon.assert.calledWith(knex, 'emails');
        });
    });

    describe('staff', function () {
        it('queries users with roles and invites and returns count', async function () {
            const mockResults = [{id: 1}, {id: 2}, {id: 3}];
            const knex = createMockKnex({unionResult: mockResults});
            const result = await config.staff.currentCountQuery(knex);

            assert.equal(result, 3);
            sinon.assert.calledWith(knex, 'users');
            sinon.assert.calledWith(knex, 'invites');
        });
    });
});
