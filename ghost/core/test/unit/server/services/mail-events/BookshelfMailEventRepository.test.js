const assert = require('assert/strict');
const sinon = require('sinon');
const {MailEvent} = require('@tryghost/mail-events');
const BookshelfMailEventRepository = require('../../../../../core/server/services/mail-events/BookshelfMailEventRepository');

describe('BookshelfMailEventRepository', function () {
    describe('save', function () {
        it('should store a mail event', async function () {
            const modelStub = {
                add: sinon.stub().resolves()
            };
            const event = new MailEvent('abc123', 'opened', '987def', 'foo@bar.baz', Date.now());
            const repository = new BookshelfMailEventRepository(modelStub);

            await repository.save(event);

            assert.ok(modelStub.add.calledOnce);
            assert.ok(modelStub.add.calledWith({
                id: event.id,
                type: event.type,
                message_id: event.messageId,
                recipient: event.recipient,
                occurred_at: new Date(event.timestampMs)
            }));
        });
    });
});
