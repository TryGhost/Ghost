import assert from 'node:assert/strict';
// @ts-expect-error total_members currently lacks type definitions.
import totalMembers from '../../../../core/frontend/helpers/total_members';

describe('{{total_members}} helper', function () {
    it('can render total members', async function () {
        const rendered = await totalMembers.call({total: 50000});
        assert.equal(rendered.string, '50,000+');
    });
});
