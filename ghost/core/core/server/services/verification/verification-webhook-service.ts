import { buildSignedWebhookRequest, sanitizeWebhookUrl } from '../../lib/signed-webhook';
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
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

const MAX_RETRY_LIMIT = 5;

export class VerificationWebhookService {
  #config: VerificationWebhookServiceDependencies['config'];
  #logging: VerificationWebhookServiceDependencies['logging'];
  #request: VerificationWebhookServiceDependencies['request'];

  constructor(dependencies: VerificationWebhookServiceDependencies = { config, logging, request }) {
    this.#config = dependencies.config;
    this.#logging = dependencies.logging;
    this.#request = dependencies.request;
  }

  #readWebhookConfig() {
    return {
      webhookType: this.#config.get('hostSettings:emailVerification:webhookType'),
      webhookUrl: this.#config.get('hostSettings:emailVerification:webhookUrl'),
      webhookSecret: this.#config.get('hostSettings:emailVerification:webhookSecret') || '',
      siteId: this.#config.get('hostSettings:siteId') || null,
    };
  }

  /**
   * Sends a verification webhook to the configured endpoint.
   */
  async sendVerificationWebhook({
    amountTriggered,
    threshold,
    method,
  }: {
    amountTriggered: number;
    threshold: number;
    method: VerificationTriggerMethod;
  }): Promise<boolean> {
    const { webhookType, webhookUrl, webhookSecret, siteId } = this.#readWebhookConfig();

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
      method,
    };

    const requestOptions = buildSignedWebhookRequest({
      payload,
      secret: typeof webhookSecret === 'string' && webhookSecret !== '' ? webhookSecret : undefined,
      retryLimit: process.env.NODE_ENV?.startsWith('test') ? 0 : MAX_RETRY_LIMIT,
    });

    const sanitizedWebhookUrl = sanitizeWebhookUrl(webhookUrl);
    this.#logging.info(`Triggering verification webhook to "${sanitizedWebhookUrl}"`);

    try {
      await this.#request(webhookUrl, requestOptions);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#logging.error(
        `Failed to send verification webhook to "${sanitizedWebhookUrl}": ${message}`,
      );
      throw error;
    }
  }
}

export const verificationWebhookService = new VerificationWebhookService();
