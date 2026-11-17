import assert from 'node:assert/strict';
import sinon from 'sinon';
import { definitionKind } from '@tryghost/kernel/domains/definitions';

const root = require('../../../services/recommendations').default;
const listener = require('../../../listeners/send-recommendation-received-alert.listener').default;
const MentionCreatedEvent = require('../../../../../core/server/services/mentions/mention-created-event');

describe('send-recommendation-received-alert listener', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('listens to the event the mentions service publishes, by its name on the event bus', function () {
    assert.equal(definitionKind(listener), 'listener');
    // The event bus keys events by class name, so this name must stay the class's name.
    assert.equal(listener.event, MentionCreatedEvent.name);
  });

  it('hands the created mention to the incoming recommendation service, read when the event arrives', async function () {
    const receiveMention = sinon.stub().resolves();
    sinon.stub(root, 'service').get(() => ({ incomingService: { receiveMention } }));
    const mention = { id: 'mention-id', verified: true };

    await listener.handle({ data: { mention } });

    sinon.assert.calledOnceWithExactly(receiveMention, mention);
  });
});
