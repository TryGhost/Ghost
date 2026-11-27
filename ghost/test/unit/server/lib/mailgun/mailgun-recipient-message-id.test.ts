import assert from 'node:assert/strict';

import {
  RECIPIENT_MESSAGE_ID_VARIABLE,
  buildRecipientMessageId,
  isTemplatedRecipientMessageId,
  setRecipientMessageIds,
} from '../../../../../core/server/lib/mailgun/mailgun-recipient-message-id';

const EMAIL_ID = '64f0c7a5e2b3a1d4c5b6a7f8';
const DOMAIN = 'example.com';

// RFC 5322 msg-id without the angle brackets, which the header template adds
const MESSAGE_ID_SHAPE = /^[A-Za-z0-9-]+\.[a-f0-9]{32}@example\.com$/;

describe('Mailgun recipient Message-Id generation', function () {
  it('exposes the recipient variable name the header template references', function () {
    assert.equal(RECIPIENT_MESSAGE_ID_VARIABLE, 'message_id');
  });

  describe('buildRecipientMessageId', function () {
    it('builds a bracket-less msg-id prefixed with the email id on the sending domain', function () {
      const id = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });

      assert.match(id, MESSAGE_ID_SHAPE);
      assert.ok(id.startsWith(`${EMAIL_ID}.`));
      assert.ok(!id.includes('<') && !id.includes('>'));
    });

    it('is deterministic for the same email and recipient', function () {
      const input = { emailId: EMAIL_ID, recipientEmail: 'member@example.com', domain: DOMAIN };

      assert.equal(buildRecipientMessageId(input), buildRecipientMessageId(input));
    });

    it('differs per recipient', function () {
      const first = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'first@example.com',
        domain: DOMAIN,
      });
      const second = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'second@example.com',
        domain: DOMAIN,
      });

      assert.notEqual(first, second);
    });

    it('differs per email', function () {
      const first = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });
      const second = buildRecipientMessageId({
        emailId: '64f0c7a5e2b3a1d4c5b6a7f9',
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });

      assert.notEqual(first, second);
    });

    it('does not expose the recipient address', function () {
      const id = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });

      assert.ok(!id.includes('member'));
    });

    it('uses the given sending domain', function () {
      const id = buildRecipientMessageId({
        emailId: EMAIL_ID,
        recipientEmail: 'member@example.com',
        domain: 'fallback.example.net',
      });

      assert.ok(id.endsWith('@fallback.example.net'));
    });

    it('uses a unique random prefix when there is no email id', function () {
      const withNull = buildRecipientMessageId({
        emailId: null,
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });
      const withUndefined = buildRecipientMessageId({
        recipientEmail: 'member@example.com',
        domain: DOMAIN,
      });

      assert.match(withNull, MESSAGE_ID_SHAPE);
      assert.match(withUndefined, MESSAGE_ID_SHAPE);
      assert.notEqual(withNull, withUndefined);
    });
  });

  describe('setRecipientMessageIds', function () {
    const buildId = (recipientEmail: string) =>
      buildRecipientMessageId({ emailId: EMAIL_ID, recipientEmail, domain: DOMAIN });

    it('adds the built message_id for every recipient and keeps the existing variables', function () {
      const recipientData = {
        'first@example.com': { name: 'First', list_unsubscribe: 'https://example.com/unsub/1' },
        'second@example.com': { name: 'Second', list_unsubscribe: 'https://example.com/unsub/2' },
      };

      const result = setRecipientMessageIds(recipientData, buildId);

      assert.deepEqual(result, {
        'first@example.com': {
          name: 'First',
          list_unsubscribe: 'https://example.com/unsub/1',
          message_id: buildId('first@example.com'),
        },
        'second@example.com': {
          name: 'Second',
          list_unsubscribe: 'https://example.com/unsub/2',
          message_id: buildId('second@example.com'),
        },
      });
    });

    it('does not mutate the recipient data passed in', function () {
      const recipientData = {
        'member@example.com': { name: 'Member' },
      };
      const snapshot = JSON.stringify(recipientData);

      const result = setRecipientMessageIds(recipientData, buildId);

      assert.equal(JSON.stringify(recipientData), snapshot);
      assert.notEqual(result['member@example.com'], recipientData['member@example.com']);
    });

    for (const [description, badId] of [
      ['no id', undefined],
      ['an empty id', ''],
      ['an id in angle brackets', '<x@example.com>'],
      ['an id with whitespace', 'x @example.com'],
    ] as const) {
      it(`throws when the builder returns ${description}`, function () {
        assert.throws(
          () =>
            setRecipientMessageIds(
              { 'first@example.com': {}, 'second@example.com': {} },
              (recipientEmail) =>
                (recipientEmail === 'first@example.com' ? 'ok@example.com' : badId) as string,
            ),
          { errorType: 'IncorrectUsageError' },
        );
      });
    }
  });

  describe('isTemplatedRecipientMessageId', function () {
    it('recognises the header template Mailgun echoes back unsubstituted', function () {
      assert.equal(isTemplatedRecipientMessageId('<%recipient.message_id%>'), true);
      assert.equal(isTemplatedRecipientMessageId('%recipient.message_id%'), true);
    });

    it('accepts a real Mailgun message id', function () {
      assert.equal(
        isTemplatedRecipientMessageId('<20260916041835.e655506fe3d629cc@example.com>'),
        false,
      );
      assert.equal(
        isTemplatedRecipientMessageId(
          buildRecipientMessageId({
            emailId: EMAIL_ID,
            recipientEmail: 'member@example.com',
            domain: DOMAIN,
          }),
        ),
        false,
      );
    });

    it('accepts anything that is not a string', function () {
      assert.equal(isTemplatedRecipientMessageId(null), false);
      assert.equal(isTemplatedRecipientMessageId(undefined), false);
      assert.equal(isTemplatedRecipientMessageId(123), false);
    });
  });
});
