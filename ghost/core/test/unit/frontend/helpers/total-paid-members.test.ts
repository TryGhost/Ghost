import assert from 'node:assert/strict';
// @ts-expect-error total_paid_members currently lacks type definitions.
import totalPaidMembers from '../../../../core/frontend/helpers/total_paid_members';

describe('{{total_paid_members}} helper', function () {
  it('can render total paid members', async function () {
    const rendered = await totalPaidMembers.call({ paid: 3000 });
    assert.equal(rendered.string, '3,000+');
  });
});
