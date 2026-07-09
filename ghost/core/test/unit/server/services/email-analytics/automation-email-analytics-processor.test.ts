import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
    type AutomationEmailAnalyticsProcessor,
    createAutomationEmailAnalyticsProcessor
} from '../../../../../core/server/services/email-analytics/automation-email-analytics-processor';
import {EventProcessingResult} from '../../../../../core/server/services/email-analytics/event-processing-result';

type ProcessorOptions = Parameters<typeof createAutomationEmailAnalyticsProcessor>[0];
type StubbedFunction<TFunction extends (..._args: never[]) => unknown> = sinon.SinonStub<Parameters<TFunction>, ReturnType<TFunction>>;
type AutomationsApiStubs = {
    [Method in keyof ProcessorOptions['automationsApi']]: StubbedFunction<ProcessorOptions['automationsApi'][Method]>;
};

describe('AutomationEmailAnalyticsProcessor', function () {
    let automationsApi: AutomationsApiStubs;
    let processor: AutomationEmailAnalyticsProcessor;

    beforeEach(function () {
        automationsApi = {
            getAutomatedEmailRecipientsByMailgunIds: sinon.stub(),
            updateAutomatedEmailRecipientsTimestamps: sinon.stub()
        };
        processor = createAutomationEmailAnalyticsProcessor({automationsApi});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('loads recipients and updates delivery/open timestamps', async function () {
        automationsApi.getAutomatedEmailRecipientsByMailgunIds.resolves([{
            id: 'recipient-1',
            automation_action_revision_id: 'revision-1',
            mailgun_message_id: 'message-1'
        }]);

        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {};

        await processor.processEventBatch([{
            type: 'delivered',
            providerId: '<message-1>',
            timestamp: new Date('2024-01-01T10:00:00.000Z')
        }, {
            type: 'opened',
            providerId: '<message-1>',
            timestamp: new Date('2024-01-01T11:00:00.000Z')
        }, {
            type: 'opened',
            providerId: '<missing>',
            timestamp: new Date('2024-01-01T12:00:00.000Z')
        }, {
            type: 'failed',
            providerId: '<message-1>',
            timestamp: new Date('2024-01-01T13:00:00.000Z')
        }], result, fetchData);

        sinon.assert.calledOnceWithExactly(automationsApi.getAutomatedEmailRecipientsByMailgunIds, ['message-1', 'missing']);
        sinon.assert.calledOnceWithExactly(automationsApi.updateAutomatedEmailRecipientsTimestamps, {
            delivered: new Map([['recipient-1', '2024-01-01 10:00:00']]),
            opened: new Map([['recipient-1', '2024-01-01 11:00:00']])
        });
        assert.equal(result.delivered, 1);
        assert.equal(result.opened, 1);
        assert.equal(result.unprocessable, 1);
        assert.equal(result.unhandled, 1);
        assert.deepEqual(fetchData.lastEventTimestamp, new Date('2024-01-01T13:00:00.000Z'));
    });

    it('keeps earliest timestamp for each recipient in batch', async function () {
        automationsApi.getAutomatedEmailRecipientsByMailgunIds.resolves([{
            id: 'recipient-1',
            automation_action_revision_id: 'revision-1',
            mailgun_message_id: 'message-1'
        }]);

        const result = new EventProcessingResult();
        const fetchData = {};

        await processor.processEventBatch([{
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date('2024-01-01T11:00:00.000Z')
        }, {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date('2024-01-01T10:00:00.000Z')
        }], result, fetchData);

        sinon.assert.calledOnceWithExactly(automationsApi.updateAutomatedEmailRecipientsTimestamps, {
            delivered: new Map([['recipient-1', '2024-01-01 10:00:00']]),
            opened: new Map()
        });
        assert.equal(result.delivered, 2);
    });

    it('ignores events without a provider ID', async function () {
        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {};

        await processor.processEventBatch([{
            type: 'delivered',
            providerId: undefined,
            timestamp: new Date('2024-01-01T10:00:00.000Z')
        }, {
            type: 'delivered',
            providerId: '',
            timestamp: new Date('2024-01-01T11:00:00.000Z')
        }, {
            type: 'opened',
            providerId: null,
            timestamp: new Date('2024-01-01T12:00:00.000Z')
        }], result, fetchData);

        // No provider IDs means there's nothing to look up
        sinon.assert.notCalled(automationsApi.getAutomatedEmailRecipientsByMailgunIds);
        sinon.assert.calledOnceWithExactly(automationsApi.updateAutomatedEmailRecipientsTimestamps, {
            delivered: new Map(),
            opened: new Map()
        });
        assert.equal(result.delivered, 0);
        assert.equal(result.opened, 0);
        assert.equal(result.unprocessable, 3);
    });

    it('does nothing to timestamps for an empty batch', async function () {
        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {};

        await processor.processEventBatch([], result, fetchData);

        sinon.assert.notCalled(automationsApi.getAutomatedEmailRecipientsByMailgunIds);
        sinon.assert.calledOnceWithExactly(automationsApi.updateAutomatedEmailRecipientsTimestamps, {
            delivered: new Map(),
            opened: new Map()
        });
        assert.equal(result.delivered, 0);
        assert.equal(result.opened, 0);
        assert.equal(result.unprocessable, 0);
        assert.equal(fetchData.lastEventTimestamp, undefined);
    });

    it('does not move lastEventTimestamp backwards', async function () {
        automationsApi.getAutomatedEmailRecipientsByMailgunIds.resolves([{
            id: 'recipient-1',
            automation_action_revision_id: 'revision-1',
            mailgun_message_id: 'message-1'
        }]);

        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {
            lastEventTimestamp: new Date('2024-06-01T00:00:00.000Z')
        };

        await processor.processEventBatch([{
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date('2024-01-01T10:00:00.000Z')
        }], result, fetchData);

        assert.deepEqual(fetchData.lastEventTimestamp, new Date('2024-06-01T00:00:00.000Z'));
    });

    it('throws when a matched recipient has no Mailgun message ID', async function () {
        automationsApi.getAutomatedEmailRecipientsByMailgunIds.resolves([{
            id: 'recipient-1',
            automation_action_revision_id: 'revision-1',
            mailgun_message_id: null
        }]);

        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {};

        await assert.rejects(
            processor.processEventBatch([{
                type: 'delivered',
                providerId: 'message-1',
                timestamp: new Date('2024-01-01T10:00:00.000Z')
            }], result, fetchData),
            /Mailgun message ID/
        );
    });
});
