import { buildSignedWebhookRequest, sanitizeWebhookUrl } from '../../lib/signed-webhook';
import { ASYNC_EXPORT_COMPONENTS } from '../exports/export-components';

type AsyncExportComponents = Record<(typeof ASYNC_EXPORT_COMPONENTS)[number], boolean>;
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');

type ExportRequestBody = {
  type: 'export';
  siteId: string;
  components: AsyncExportComponents;
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

  /**
   * Requests an async export archive from the configured host service.
   * The host service generates the archive in the background and emails a
   * download link to the site owner.
   *
   * The webhook is a shared channel that dispatches on the `type` field of
   * the event envelope, and the receiver is fire-and-forget (it always
   * responds 200) — a 2xx means "delivered", not "validated".
   */
  async requestArchive({ components }: { components: AsyncExportComponents }): Promise<void> {
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
      components,
    };

    const requestOptions = buildSignedWebhookRequest({
      payload,
      secret: webhookSecret,
      // No retries: the request is not idempotent (each delivery can
      // schedule an archive)
      retryLimit: 0,
    });

    const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);
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
