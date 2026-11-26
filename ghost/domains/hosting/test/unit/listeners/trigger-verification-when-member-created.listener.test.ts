import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';
import { MemberCreatedEvent } from '../../../../../shared/transition/member-events';
import triggerVerificationWhenMemberCreated from '../../../listeners/trigger-verification-when-member-created.listener';
import { VerificationTrigger } from '../../../services/verification-trigger.service';

describe('Trigger verification when a member is created', function () {
  let handle: sinon.SinonStub;

  beforeEach(function () {
    handle = sinon.stub(VerificationTrigger.prototype, 'handleMemberCreated').resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  function site(verified: unknown) {
    const get = sinon.stub();
    get.withArgs('hostSettings:emailVerification:verified').returns(verified);
    return { config: { get } } as unknown as Site;
  }

  const event = MemberCreatedEvent.create({ memberId: 'member', source: 'api', batchId: 'batch' });

  it('hands the event to the verification trigger on a site that is not verified', async function () {
    await triggerVerificationWhenMemberCreated(site(undefined), event);

    sinon.assert.calledOnceWithExactly(handle, event);
  });

  // The legacy trigger did not subscribe at all on a verified site.
  it('does nothing on a site the host has verified', async function () {
    await triggerVerificationWhenMemberCreated(site(true), event);

    sinon.assert.notCalled(handle);
  });

  it('lets a failure reach whoever called it, which logs it', async function () {
    const failure = new Error('events could not be read');
    handle.rejects(failure);

    await assert.rejects(
      triggerVerificationWhenMemberCreated(site(false), event),
      (thrown) => thrown === failure,
    );
  });
});
