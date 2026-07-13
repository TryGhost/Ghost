import assert from 'node:assert/strict';

import {getMailgunMessageId} from '../../../../../core/server/services/automations/mailgun-message-id';

describe('getMailgunMessageId', function () {
    it('parses the Mailgun ID from a send result', function () {
        assert.equal(getMailgunMessageId({id: 'mailgun-message-id'}), 'mailgun-message-id');
    });

    it('normalizes whitespace and angle brackets', function () {
        assert.equal(getMailgunMessageId({id: ' <mailgun-message-id> '}), 'mailgun-message-id');
    });

    it('ignores SMTP message IDs', function () {
        assert.equal(getMailgunMessageId({messageId: '<smtp-message-id>'}), undefined);
    });

    it('ignores invalid send results', function () {
        assert.equal(getMailgunMessageId(undefined), undefined);
        assert.equal(getMailgunMessageId('Mail sent'), undefined);
        assert.equal(getMailgunMessageId({id: 123}), undefined);
    });
});
