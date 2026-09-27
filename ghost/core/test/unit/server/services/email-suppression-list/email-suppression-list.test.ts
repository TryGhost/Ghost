import sinon from 'sinon';
import logging from '@tryghost/logging';
// @ts-expect-error This module lacks type definitions.
import DomainEvents from '@tryghost/domain-events';
// @ts-expect-error This module lacks type definitions.
import MailgunEmailSuppressionList from '../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list';
import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import emailSuppressionList from '../../../../../core/server/services/email-suppression-list/email-suppression-list';
const { EmailSuppressionData, EmailSuppressedEvent } = emailSuppressionList;

describe('EmailSuppressionData', function () {
  it('Has null info when not suppressed', function () {
    const now = new Date();
    const data = new EmailSuppressionData(false, {
      reason: 'spam',
      timestamp: now,
    });

    assert(data.suppressed === false);
    assert(data.info === null);
  });
  it('Has info when suppressed', function () {
    const now = new Date();
    const data = new EmailSuppressionData(true, {
      reason: 'spam',
      timestamp: now,
    });

    assert(data.suppressed === true);
    assert(data.info.reason === 'spam');
    assert(data.info.timestamp === now);
  });
});

describe('EmailSuppressedEvent', function () {
  it('Exposes a create factory method', function () {
    const event = EmailSuppressedEvent.create({
      emailAddress: 'test@test.com',
      emailId: '1234567890abcdef',
      reason: 'spam',
    });
    assert(event instanceof EmailSuppressedEvent);
    assert(event.timestamp);
  });
});

describe('provider suppression cleanup policy', () => {
  afterEach(() => sinon.restore());
  for (const [method, reason] of [
    ['removeComplaint', 'complaint'],
    ['removeUnsubscribe', 'unsubscribe'],
  ]) {
    it(`${method} propagates webhook cleanup failures but allows polling to continue`, async () => {
      const failure = new Error('provider unavailable');
      const remove = sinon.stub().rejects(failure);
      const log = sinon.stub(logging, 'error');
      const service = new MailgunEmailSuppressionList({ apiClient: { [method]: remove } });
      await assert.rejects(service[method]('reader@example.com', { requireSuccess: true }), {
        statusCode: 503,
        message: `Could not remove provider ${reason}`,
      });
      assert.equal(await service[method]('reader@example.com', { requireSuccess: false }), false);
      assert.equal(await service[method]('reader@example.com'), false);
      sinon.assert.calledThrice(log);

      remove.resolves();
      assert.equal(await service[method]('reader@example.com'), undefined);
      sinon.assert.alwaysCalledWithExactly(remove, 'reader@example.com');
      sinon.assert.alwaysCalledOn(remove, service.apiClient);
    });
  }
});

describe('suppression persistence by transport', () => {
  afterEach(() => sinon.restore());

  for (const method of ['handleBounce', 'handleComplaint']) {
    for (const eventSource of ['poll', 'webhook']) {
      it(`${eventSource} ${method} preserves suppression semantics when disabling the member fails`, async () => {
        const failure = new Error('member update failed');
        const transacting = {};
        const Suppression = {
          add: sinon.stub().resolves(),
          transaction: sinon.stub().callsFake(async (callback) => callback(transacting)),
        };
        const membersRepository = {
          get: sinon.stub().resolves({ id: 'member' }),
          update: sinon.stub().rejects(failure),
        };
        const dispatch = sinon.stub(DomainEvents, 'dispatch');
        const service = new MailgunEmailSuppressionList({ Suppression, membersRepository });
        const event = {
          email: 'reader@example.com',
          emailId: 'email',
          timestamp: new Date(),
          suppress: true,
        };
        const data = {
          email: event.email,
          email_id: event.emailId,
          created_at: event.timestamp,
          reason: method === 'handleBounce' ? 'bounce' : 'spam',
        };

        if (eventSource === 'poll') {
          await assert.rejects(service[method](event, { eventSource }), (err) => err === failure);
          // The insert is committed independently; failure cannot roll it back.
          sinon.assert.notCalled(Suppression.transaction);
          sinon.assert.calledOnceWithExactly(Suppression.add, data);
          sinon.assert.calledOnceWithExactly(membersRepository.get, { email: event.email });
          sinon.assert.calledOnceWithExactly(
            membersRepository.update,
            { email_disabled: true },
            { id: 'member' },
          );
          sinon.assert.calledOnce(dispatch);
          sinon.assert.callOrder(Suppression.add, dispatch, membersRepository.update);
          assert.deepEqual(dispatch.firstCall.args[0].data, {
            emailAddress: event.email,
            emailId: event.emailId,
            reason: data.reason,
          });
        } else {
          // Automation/gift webhook callers omit the options argument.
          await assert.rejects(service[method](event), { statusCode: 503 });
          sinon.assert.calledOnce(Suppression.transaction);
          sinon.assert.calledOnceWithExactly(Suppression.add, data, { transacting });
          sinon.assert.calledOnceWithExactly(
            membersRepository.get,
            { email: event.email },
            { transacting, forUpdate: true },
          );
          sinon.assert.calledOnceWithExactly(
            membersRepository.update,
            { email_disabled: true },
            { id: 'member', transacting },
          );
          sinon.assert.notCalled(dispatch);
        }
      });
    }
  }

  for (const code of ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT', 'ER_UNKNOWN_ERROR']) {
    it(`preserves polling suppression insert handling for ${code}`, async () => {
      const failure = Object.assign(new Error('suppression insert failed'), { code });
      const Suppression = { add: sinon.stub().rejects(failure) };
      const membersRepository = {
        get: sinon.stub().resolves({ id: 'member' }),
        update: sinon.stub().resolves(),
      };
      const dispatch = sinon.stub(DomainEvents, 'dispatch');
      sinon.stub(logging, 'info');
      const service = new MailgunEmailSuppressionList({ Suppression, membersRepository });
      const event = { email: 'reader@example.com', timestamp: new Date() };
      if (code === 'ER_UNKNOWN_ERROR') {
        await assert.rejects(
          service.handleComplaint(event, { eventSource: 'poll' }),
          (err) => err === failure,
        );
        sinon.assert.notCalled(dispatch);
        sinon.assert.notCalled(membersRepository.get);
        sinon.assert.notCalled(membersRepository.update);
      } else {
        await service.handleComplaint(event, { eventSource: 'poll' });
        sinon.assert.calledOnce(dispatch);
        sinon.assert.calledOnceWithExactly(
          membersRepository.update,
          { email_disabled: true },
          { id: 'member' },
        );
      }
      sinon.assert.calledOnce(Suppression.add);
    });
  }
});
