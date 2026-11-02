import type { GhostLogger } from '@tryghost/logging';
import {
  buildSignedWebhookRequest,
  describeWebhookError,
  sanitizeWebhookUrl,
} from '../../lib/signed-webhook';
const errors = require('@tryghost/errors');

export interface SupportRequest {
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  message: string;
  source: string | null;
  pageUrl: string | null;
  context: Record<string, string>;
}

interface SupportRequestBody extends SupportRequest {
  type: 'support_request';
  siteId: string;
}

interface SupportRequestsServiceDependencies {
  config: {
    get: (key: string) => unknown;
  };
  logging: Pick<GhostLogger, 'info' | 'error'>;
  request: (url: string, options: ReturnType<typeof buildSignedWebhookRequest>) => Promise<unknown>;
}

export class SupportRequestsService {
  #config: SupportRequestsServiceDependencies['config'];
  #logging: SupportRequestsServiceDependencies['logging'];
  #request: SupportRequestsServiceDependencies['request'];

  constructor(dependencies: SupportRequestsServiceDependencies) {
    this.#config = dependencies.config;
    this.#logging = dependencies.logging;
    this.#request = dependencies.request;
  }

  #readSupportRequestConfig() {
    return {
      webhookUrl: this.#config.get('hostSettings:supportRequest:webhookUrl'),
      webhookSecret: this.#config.get('hostSettings:supportRequest:webhookSecret'),
      siteId: this.#config.get('hostSettings:siteId'),
    };
  }

  /**
   * Sends a staff user's support request to the configured host service.
   *
   * The webhook is a shared channel that dispatches on the `type` field of
   * the event envelope, and the receiver may acknowledge before acting on it,
   * so a 2xx means "delivered", not "the support request was handled".
   */
  async send(supportRequest: SupportRequest): Promise<void> {
    const { webhookUrl, webhookSecret, siteId } = this.#readSupportRequestConfig();

    if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
      throw new errors.NotFoundError({
        message: 'Support requests are not enabled on this site',
      });
    }

    if (typeof webhookSecret !== 'string' || webhookSecret.length === 0) {
      this.#logging.error(
        'Support request is misconfigured: hostSettings:supportRequest:webhookSecret is missing while hostSettings:supportRequest:webhookUrl is set.',
      );

      throw new errors.IncorrectUsageError({
        message: 'Support requests are not configured correctly on this site',
      });
    }

    const normalizedSiteId =
      typeof siteId === 'string' ? siteId : typeof siteId === 'number' ? String(siteId) : '';

    if (normalizedSiteId.length === 0) {
      this.#logging.error(
        'Support request is misconfigured: hostSettings:siteId is missing while hostSettings:supportRequest:webhookUrl is set.',
      );

      throw new errors.IncorrectUsageError({
        message: 'Support requests are not configured correctly on this site',
      });
    }

    const payload: SupportRequestBody = {
      type: 'support_request',
      siteId: normalizedSiteId,
      ...supportRequest,
    };

    const requestOptions = buildSignedWebhookRequest({
      payload,
      secret: webhookSecret,
      // No retries: the request is not idempotent (a repeated delivery
      // would duplicate the support request)
      retryLimit: 0,
    });

    const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);

    this.#logging.info(`Sending support request to "${sanitizedUrl}"`);

    try {
      await this.#request(webhookUrl, requestOptions);
    } catch (error) {
      const message = describeWebhookError(error);

      this.#logging.error(`Failed to send support request to "${sanitizedUrl}": ${message}`);

      throw new errors.InternalServerError({
        statusCode: 502,
        message: 'Failed to send the support request. Please try again later.',
      });
    }
  }
}
