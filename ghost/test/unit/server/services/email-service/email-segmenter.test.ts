import assert from 'node:assert/strict';
import sinon from 'sinon';

const EmailSegmenter = require('../../../../../core/server/services/email-service/email-segmenter');

// Which members an email reaches is tested through real sends in
// test/integration/services/email-service/batch-sending.test.js and
// test/e2e-api/admin/member-filter-agreement.test.ts.
describe('Email segmenter', function () {
  const newsletter = (visibility: string) => ({
    id: 'newsletter-123',
    get: (key: string) => (key === 'visibility' ? visibility : undefined),
  });

  it('rejects the none recipient filter', async function () {
    const segmenter = new EmailSegmenter({ membersRepository: { list: sinon.stub() } });

    await assert.rejects(segmenter.getMembersCount(newsletter('members'), 'none', null), {
      message: 'Cannot send email to "none" recipient filter',
    });
  });

  it('rejects an unknown newsletter visibility', async function () {
    const segmenter = new EmailSegmenter({ membersRepository: { list: sinon.stub() } });

    await assert.rejects(segmenter.getMembersCount(newsletter(''), 'all', null), {
      message: 'Unexpected visibility value "". Use one of the valid: "members", "paid".',
    });
  });
});
