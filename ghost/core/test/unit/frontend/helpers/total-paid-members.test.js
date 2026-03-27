const assert = require('node:assert/strict');

const total_paid_members = require('../../../../core/frontend/helpers/total_paid_members');

describe('{{total_paid_members}} helper', function () {
    it('can render total paid members', async function () {
        const rendered = await total_paid_members.call({paid: 3000});
        assert.equal(rendered.string, '3,000+');
    });
});
