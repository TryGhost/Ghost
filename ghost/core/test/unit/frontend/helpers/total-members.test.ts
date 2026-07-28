import assert from 'node:assert/strict';
import total_members from '../../../../core/frontend/helpers/total_members';

describe('{{total_members}} helper', function () {
    it('can render total members', async function () {
        const rendered = await total_members.call({total: 50000});
        assert.equal(rendered.string, '50,000+');
    });
});
