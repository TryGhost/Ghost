import {randomUUID} from 'node:crypto';
import type {
    WebhookCreateRequest,
    WebhookCreateResponse,
    WebhookDispatchRequest,
    WebhookDispatchResponse,
    WebhookListResponse,
    WebhookUpdateRequest,
    WebhookUpdateResponse
} from './contracts.js';
import type {WebhookRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type WebhookService = {
    createWebhook: (input: WebhookCreateRequest) => Promise<WebhookCreateResponse>;
    listWebhooks: (integrationId: string) => Promise<WebhookListResponse>;
    updateWebhook: (integrationId: string, id: string, input: WebhookUpdateRequest) => Promise<WebhookUpdateResponse>;
    deleteWebhook: (integrationId: string, id: string) => Promise<void>;
    dispatchEvent: (input: WebhookDispatchRequest) => Promise<WebhookDispatchResponse>;
    markDispatchFailed: (id: string, error: string) => Promise<void>;
    markDispatchSucceeded: (id: string) => Promise<void>;
};

export const createWebhookService = (repository: WebhookRepository): WebhookService => {
    const maxAttempts = 5;
    const backoffMs = 10000;

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

    const listWebhooks = async (integrationId: string) => {
        const webhooks = await repository.listWebhooksByIntegration(integrationId);
        return {
            webhooks: webhooks.map((webhook) => ({
                id: webhook.id,
                integrationId: webhook.integrationId,
                event: webhook.event,
                targetUrl: webhook.targetUrl
            }))
        };
    };

    const updateWebhook = async (integrationId: string, id: string, input: WebhookUpdateRequest) => {
        const existing = await repository.getWebhookById(id);
        if (!existing || existing.integrationId !== integrationId) {
            throw new HttpError(404, 'webhook_not_found', 'Webhook not found');
        }

        const updated = await repository.updateWebhook({
            ...existing,
            event: input.event,
            targetUrl: input.targetUrl
        });

        return {
            webhook: {
                id: updated.id,
                integrationId: updated.integrationId,
                event: updated.event,
                targetUrl: updated.targetUrl
            }
        };
    };

    const deleteWebhook = async (integrationId: string, id: string) => {
        const existing = await repository.getWebhookById(id);
        if (!existing || existing.integrationId !== integrationId) {
            throw new HttpError(404, 'webhook_not_found', 'Webhook not found');
        }
        await repository.deleteWebhook(id);
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
                status: 'pending',
                attempt: 0,
                maxAttempts,
                nextAttemptAt: Date.now(),
                lastError: null
            });
            queued += 1;
        }

        return {queued};
    };

    const markDispatchFailed = async (id: string, error: string) => {
        const message = await repository.getOutboxById(id);
        if (!message) {
            throw new HttpError(404, 'outbox_not_found', 'Outbox message not found');
        }

        const attempt = message.attempt + 1;
        const shouldRetry = attempt < message.maxAttempts;
        await repository.updateOutbox({
            ...message,
            status: shouldRetry ? 'retrying' : 'failed',
            attempt,
            nextAttemptAt: Date.now() + backoffMs * attempt,
            lastError: error
        });
    };

    const markDispatchSucceeded = async (id: string) => {
        const message = await repository.getOutboxById(id);
        if (!message) {
            throw new HttpError(404, 'outbox_not_found', 'Outbox message not found');
        }

        await repository.updateOutbox({
            ...message,
            status: 'completed',
            nextAttemptAt: Date.now(),
            lastError: null
        });
    };

    return {
        createWebhook,
        listWebhooks,
        updateWebhook,
        deleteWebhook,
        dispatchEvent,
        markDispatchFailed,
        markDispatchSucceeded
    };
};
