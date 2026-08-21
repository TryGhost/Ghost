import crypto from 'crypto';
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');

export type ExportComponents = {
  content: boolean;
  members: boolean;
  analytics: boolean;
  themes: boolean;
  routes: boolean;
  media: boolean;
};

type ExportRequestBody = {
  type: 'export';
  siteId: string;
  requestedBy: string;
  components: ExportComponents;
};

type ExportRequestsServiceDependencies = {
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

export class ExportRequestsService {
  #config: ExportRequestsServiceDependencies['config'];
  #logging: ExportRequestsServiceDependencies['logging'];
  #request: ExportRequestsServiceDependencies['request'];

  constructor(dependencies: ExportRequestsServiceDependencies = { config, logging, request }) {
    this.#config = dependencies.config;
    this.#logging = dependencies.logging;
    this.#request = dependencies.request;
  }

  #readExportRequestConfig() {
    return {
      webhookUrl: this.#config.get('hostSettings:export:webhookUrl'),
      webhookSecret: this.#config.get('hostSettings:export:webhookSecret'),
      siteId: this.#config.get('hostSettings:siteId'),
    };
  }

  #computeSignature(timestamp: string, body: string, secret: string): string {
    const baseString = `${timestamp}:${body}`;
    return crypto.createHmac('sha256', secret).update(baseString).digest('base64');
  }

  #sanitizeUrl(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return '[invalid archive url]';
    }
  }

  /**
   * Requests an async export archive from the configured host service.
   * The host service generates the archive in the background and emails a
   * download link to `requestedBy`.
   *
   * The webhook is a shared channel that dispatches on the `type` field of
   * the event envelope, and the receiver is fire-and-forget (it always
   * responds 200) — a 2xx means "delivered", not "validated".
   */
  async requestArchive({
    components,
    requestedBy,
  }: {
    components: ExportComponents;
    requestedBy: string;
  }): Promise<void> {
    const { webhookUrl, webhookSecret, siteId } = this.#readExportRequestConfig();

    if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
      throw new errors.NotFoundError({
        message: 'Export archive generation is not enabled on this site',
      });
    }

    if (typeof webhookSecret !== 'string' || webhookSecret.length === 0) {
      this.#logging.error(
        'Export archive request is misconfigured: hostSettings:export:webhookSecret is missing while hostSettings:export:webhookUrl is set.',
      );
      throw new errors.IncorrectUsageError({
        message: 'Export requests are not configured correctly on this site',
      });
    }

    const normalizedSiteId =
      typeof siteId === 'string' ? siteId : typeof siteId === 'number' ? String(siteId) : '';

    if (normalizedSiteId.length === 0) {
      this.#logging.error(
        'Export archive request is misconfigured: hostSettings:siteId is missing while hostSettings:export:webhookUrl is set.',
      );
      throw new errors.IncorrectUsageError({
        message: 'Export requests are not configured correctly on this site',
      });
    }

    const payload: ExportRequestBody = {
      type: 'export',
      siteId: normalizedSiteId,
      requestedBy,
      components,
    };

    const requestBody = JSON.stringify(payload);
    const timestamp = Date.now().toString();

    const headers: Record<string, string | number> = {
      'Content-Length': Buffer.byteLength(requestBody),
      'Content-Type': 'application/json',
      'Content-Version': `v${ghostVersion.safe}`,
      'X-Ghost-Request-Timestamp': timestamp,
      'X-Ghost-Signature': this.#computeSignature(timestamp, requestBody, webhookSecret),
    };

    const requestOptions = {
      method: 'POST',
      body: requestBody,
      headers,
      timeout: {
        request: REQUEST_TIMEOUT_MS,
      },
      // No retries: the request is not idempotent (each delivery can
      // schedule an archive)
      retry: {
        limit: 0,
      },
    };

    const sanitizedUrl = this.#sanitizeUrl(webhookUrl);
    this.#logging.info(`Requesting export archive generation from "${sanitizedUrl}"`);

    try {
      await this.#request(webhookUrl, requestOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#logging.error(
        `Failed to request export archive generation from "${sanitizedUrl}": ${message}`,
      );
      throw new errors.InternalServerError({
        statusCode: 502,
        message: 'Failed to start the export. Please try again later.',
      });
    }
  }
}

export const exportRequestsService = new ExportRequestsService();
