import {describe, expect, it} from 'vitest';
import {createWebhookService} from './service.js';
import type {WebhookRepository} from './repo.js';

const createRepository = (): WebhookRepository => {
    const webhooks: {id: string; integrationId: string; event: string; targetUrl: string}[] = [];
    const outbox: {id: string}[] = [];

    return {
        createWebhook: async (webhook) => {
            const record = webhook as {id: string; integrationId: string; event: string; targetUrl: string; createdAt: number};
            webhooks.push(record);
            return record;
        },
        listWebhooksByEvent: async (event) => webhooks.filter((hook) => hook.event === event) as any,
        createOutbox: async (message) => {
            const record = message as {id: string; event: string; payload: string; createdAt: number; status: string};
            outbox.push(record);
            return record;
        }
    };
};

describe('webhook service', () => {
    it('creates webhooks and queues dispatches', async () => {
        const repository = createRepository();
        const service = createWebhookService(repository);

        const webhook = await service.createWebhook({
            integrationId: 'integration',
            event: 'post.published',
            targetUrl: 'https://example.com/webhook'
        });

        const result = await service.dispatchEvent({event: 'post.published', payload: {id: 'post'}});

        expect(webhook.webhook.event).toBe('post.published');
        expect(result.queued).toBe(1);
    });
});
