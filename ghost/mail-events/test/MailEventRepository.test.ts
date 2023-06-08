import assert from 'assert';
import sinon from 'sinon';

import MailEvent from '../src/MailEvent';
import MailEventRepository from '../src/MailEventRepository';

describe('MailEventRepository', function () {
    describe('persist', function () {
        it('should persist a mail event', async function () {
            const modelStub = {
                add: sinon.stub().resolves()
            };
            const event = new MailEvent('abc123', 'opened', '987def', 'foo@bar.baz', Date.now());
            const repository = new MailEventRepository(modelStub);

            await repository.persist(event);

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
