import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';
import { checkVerificationRequired } from '../../../actions/check-verification-required.action';
import { testImportThreshold } from '../../../actions/test-import-threshold.action';
import { VerificationTrigger } from '../../../services/verification-trigger.service';

describe('What other code may ask about email verification', function () {
  const site = { config: { get: sinon.stub() } } as unknown as Site;

  afterEach(function () {
    sinon.restore();
  });

  it('says whether verification is required, passing on what kind of send is asking', async function () {
    const check = sinon.stub(VerificationTrigger.prototype, 'checkVerificationRequired');
    check.resolves(true);

    assert.equal(await checkVerificationRequired(site, { newsletterSend: true }), true);
    sinon.assert.calledOnceWithExactly(check, { newsletterSend: true });

    check.resolves(false);
    assert.equal(await checkVerificationRequired(site), false);
    sinon.assert.calledWithExactly(check.secondCall, undefined);
  });

  it('tests the import threshold', async function () {
    const test = sinon.stub(VerificationTrigger.prototype, 'testImportThreshold').resolves();

    await testImportThreshold(site);

    sinon.assert.calledOnceWithExactly(test);
  });
});
