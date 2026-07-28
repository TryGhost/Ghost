import assert from 'node:assert/strict';
import total_paid_members from '../../../../core/frontend/helpers/total_paid_members';

describe('{{total_paid_members}} helper', function () {
    it('can render total paid members', async function () {
        const rendered = await total_paid_members.call({paid: 3000});
        assert.equal(rendered.string, '3,000+');
    });
});
