import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  sendAutomationEmailGroups,
  type PreparedAutomationEmail,
} from '../../../../../core/server/services/member-welcome-emails/send-automation-email-groups';

describe('sendAutomationEmailGroups', function () {
  function email(id: string, overrides: Partial<PreparedAutomationEmail> = {}) {
    const to = `${id}@example.invalid`;
    const listUnsubscribe = `https://example.invalid/unsubscribe/?uuid=${id}&key=test`;
    return {
      automationActionRevisionId: 'revision',
      automationRunStepId: id,
      message: {
        to,
        from: 'site@example.invalid',
        tags: ['automation'],
        subject: 'Welcome',
        html: `<a href="${listUnsubscribe.replace('&', '&amp;')}">Unsubscribe</a>`,
        text: listUnsubscribe,
        listUnsubscribe,
        trackOpens: true,
        ...overrides,
      },
    };
  }

  it('submits compatible recipients together while preserving personalized sends and result order', async function () {
    const emails = [email('one'), email('two', { subject: 'Hi, Two' }), email('three')];
    const sendSingle = sinon.stub().resolves({ id: 'single-id' });
    const send = sinon.stub().resolves({
      recipientMessageIds: { 'one@example.invalid': 'one-id', 'three@example.invalid': 'three-id' },
    });
    const results = await sendAutomationEmailGroups({
      emails,
      prepare: async ({ message }) => message,
      sendSingle,
      bulkMailer: { send, getBatchSize: () => 100 },
    });

    sinon.assert.calledOnceWithExactly(sendSingle, emails[1].message);
    sinon.assert.calledOnce(send);
    const [message, recipients] = send.firstCall.args;
    assert.match(message.html, /%recipient\.automation_unsubscribe_html%/);
    assert.equal(
      recipients['one@example.invalid'].list_unsubscribe,
      emails[0].message.listUnsubscribe,
    );
    assert.equal(
      recipients['three@example.invalid'].list_unsubscribe,
      emails[2].message.listUnsubscribe,
    );
    assert.deepEqual(message.recipientMessageIdPrefixes, {
      'one@example.invalid': 'one',
      'three@example.invalid': 'three',
    });
    assert.deepEqual(
      results,
      ['one-id', 'single-id', 'three-id'].map((id) => ({
        status: 'fulfilled',
        value: { id },
      })),
    );
  });

  it('reports a rejected batch per step without resending its recipients', async function () {
    const reason = new Error('Mailgun timed out');
    const sendSingle = sinon.stub();
    const send = sinon.stub().rejects(reason);
    const results = await sendAutomationEmailGroups({
      emails: [email('one'), email('two')],
      prepare: async ({ message }) => message,
      sendSingle,
      bulkMailer: { send, getBatchSize: () => 100 },
    });

    sinon.assert.calledOnce(send);
    sinon.assert.notCalled(sendSingle);
    assert.deepEqual(results, [
      { status: 'rejected', reason },
      { status: 'rejected', reason },
    ]);
  });

  it('keeps separate action revisions and duplicate addresses out of the same request', async function () {
    const first = email('one');
    const duplicate = email('two', { to: 'ONE@example.invalid' });
    const otherRevision = { ...email('three'), automationActionRevisionId: 'other' };
    const sendSingle = sinon.stub().resolves(null);
    const send = sinon.stub();

    await sendAutomationEmailGroups({
      emails: [first, duplicate, otherRevision],
      prepare: async ({ message }) => message,
      sendSingle,
      bulkMailer: { send, getBatchSize: () => 100 },
    });

    sinon.assert.notCalled(send);
    assert.deepEqual(sendSingle.args.map(([message]) => message.to).sort(), [
      'ONE@example.invalid',
      'one@example.invalid',
      'three@example.invalid',
    ]);
  });
});
