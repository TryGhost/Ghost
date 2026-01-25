import {randomUUID} from 'node:crypto';
import type {
    WebhookCreateRequest,
    WebhookCreateResponse,
    WebhookDispatchRequest,
    WebhookDispatchResponse
} from './contracts.js';
import type {WebhookRepository} from './repo.js';

export type WebhookService = {
    createWebhook: (input: WebhookCreateRequest) => Promise<WebhookCreateResponse>;
    dispatchEvent: (input: WebhookDispatchRequest) => Promise<WebhookDispatchResponse>;
};

export const createWebhookService = (repository: WebhookRepository): WebhookService => {
    const createWebhook = async (input: WebhookCreateRequest) => {
        const webhook = await repository.createWebhook({
            id: randomUUID(),
            integrationId: input.integrationId,
            event: input.event,
            targetUrl: input.targetUrl,
            createdAt: Date.now()
        });

        return {
            webhook: {
                id: webhook.id,
                integrationId: webhook.integrationId,
                event: webhook.event,
                targetUrl: webhook.targetUrl
            }
        };
    };

    const dispatchEvent = async (input: WebhookDispatchRequest) => {
        const webhooks = await repository.listWebhooksByEvent(input.event);
        let queued = 0;

        for (const webhook of webhooks) {
            await repository.createOutbox({
                id: randomUUID(),
                event: input.event,
                payload: JSON.stringify({targetUrl: webhook.targetUrl, payload: input.payload}),
                createdAt: Date.now(),
                status: 'pending'
            });
            queued += 1;
        }

        return {queued};
    };

    return {
        createWebhook,
        dispatchEvent
    };
};
