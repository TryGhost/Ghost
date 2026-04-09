/* eslint-disable @typescript-eslint/no-require-imports */
import crypto from 'crypto';
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const config = require('../../../shared/config');

type VerificationTriggerMethod = 'admin' | 'api' | 'import';

type VerificationWebhookBody = {
    type: string;
    siteId: string | null;
    amountTriggered: number;
    threshold: number;
    method: VerificationTriggerMethod;
};

type VerificationWebhookServiceDependencies = {
    config: {
        get: (key: string) => unknown;
    };
    logging: {
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
    };
    request: (url: string, options: unknown) => Promise<unknown>;
};

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRY_LIMIT = 5;

export class VerificationWebhookService {
    #config: VerificationWebhookServiceDependencies['config'];
    #logging: VerificationWebhookServiceDependencies['logging'];
    #request: VerificationWebhookServiceDependencies['request'];

    constructor(dependencies: VerificationWebhookServiceDependencies = {config, logging, request}) {
        this.#config = dependencies.config;
        this.#logging = dependencies.logging;
        this.#request = dependencies.request;
    }

    #readWebhookConfig() {
        return {
            webhookType: this.#config.get('hostSettings:emailVerification:webhookType'),
            webhookUrl: this.#config.get('hostSettings:emailVerification:webhookUrl'),
            webhookSecret: this.#config.get('hostSettings:emailVerification:webhookSecret') || '',
            siteId: this.#config.get('hostSettings:siteId') || null
        };
    }

    #computeSignature(timestamp: string, body: string, secret: string): string {
        const baseString = `${timestamp}:${body}`;
        return crypto.createHmac('sha256', secret).update(baseString).digest('base64');
    }

    #sanitizeWebhookUrl(webhookUrl: string): string {
        try {
            return new URL(webhookUrl).origin;
        } catch {
            return '[invalid webhook url]';
        }
    }

    /**
     * Sends a verification webhook to the configured endpoint.
     */
    async sendVerificationWebhook({
        amountTriggered,
        threshold,
        method
    }: {
        amountTriggered: number;
        threshold: number;
        method: VerificationTriggerMethod;
    }): Promise<boolean> {
        const {webhookType, webhookUrl, webhookSecret, siteId} = this.#readWebhookConfig();

        if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
            this.#logging.warn('Verification webhook is not configured because webhookUrl is missing.');
            return false;
        }

        if (typeof webhookType !== 'string' || webhookType.length === 0) {
            this.#logging.warn('Verification webhook is not configured because webhookType is missing.');
            return false;
        }

        const payload: VerificationWebhookBody = {
            type: webhookType,
            siteId: typeof siteId === 'string' ? siteId : null,
            amountTriggered,
            threshold,
            method
        };

        const requestBody = JSON.stringify(payload);
        const timestamp = Date.now().toString();

        const headers: Record<string, string | number> = {
            'Content-Length': Buffer.byteLength(requestBody),
            'Content-Type': 'application/json',
            'Content-Version': `v${ghostVersion.safe}`,
            'X-Ghost-Request-Timestamp': timestamp
        };

        if (typeof webhookSecret === 'string' && webhookSecret !== '') {
            headers['X-Ghost-Signature'] = this.#computeSignature(timestamp, requestBody, webhookSecret);
        }

        const requestOptions = {
            method: 'POST',
            body: requestBody,
            headers,
            timeout: {
                request: REQUEST_TIMEOUT_MS
            },
            retry: {
                limit: process.env.NODE_ENV?.startsWith('test') ? 0 : MAX_RETRY_LIMIT
            }
        };

        const sanitizedWebhookUrl = this.#sanitizeWebhookUrl(webhookUrl);
        this.#logging.info(`Triggering verification webhook to "${sanitizedWebhookUrl}"`);

        try {
            await this.#request(webhookUrl, requestOptions);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.#logging.error(`Failed to send verification webhook to "${sanitizedWebhookUrl}": ${message}`);
            throw error;
        }
    }
}

export const verificationWebhookService = new VerificationWebhookService();
