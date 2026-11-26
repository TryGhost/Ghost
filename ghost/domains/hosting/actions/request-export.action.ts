import errors from '@tryghost/errors';
import type { Config, Logger, Site } from '#support/site';
import type { ASYNC_EXPORT_COMPONENTS } from '../../../core/server/data/exporter/export-components';
import {
  buildSignedWebhookRequest,
  describeWebhookError,
  sanitizeWebhookUrl,
} from '../../../core/server/lib/signed-webhook';
import { request } from '../../../shared/transition/request';

type AsyncExportComponents = Record<(typeof ASYNC_EXPORT_COMPONENTS)[number], boolean>;

type ExportRequestBody = {
  type: 'export';
  siteId: string;
  components: AsyncExportComponents;
  requestedByUserId: string;
};

export type ExportRequest = {
  components: AsyncExportComponents;
  requestedByUserId: string;
};

export type RequestExportDeps = {
  config: Config;
  logging: Logger;
  request: (url: string, options: ReturnType<typeof buildSignedWebhookRequest>) => Promise<unknown>;
};

/**
 * Requests an async export from the configured host service.
 * The host service generates the export in the background and emails a
 * download link to the staff user who requested it.
 *
 * The requester is sent as their user id rather than an email address.
 * The host reads the address from this site's database when the export is
 * ready.
 *
 * The webhook is a shared channel that dispatches on the `type` field of
 * the event envelope, and the receiver is fire-and-forget (it always
 * responds 200) — a 2xx means "delivered", not "validated".
 */
export class RequestExport {
  config: RequestExportDeps['config'];
  logging: RequestExportDeps['logging'];
  request: RequestExportDeps['request'];

  constructor({ config, logging, request }: RequestExportDeps) {
    this.config = config;
    this.logging = logging;
    this.request = request;
  }

  async handle({ components, requestedByUserId }: ExportRequest): Promise<void> {
    const webhookUrl = this.config.get('hostSettings:export:webhookUrl');
    const webhookSecret = this.config.get('hostSettings:export:webhookSecret');
    const siteId = this.config.get('hostSettings:siteId');

    if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
      throw new errors.NotFoundError({
        message: 'Export generation is not enabled on this site',
      });
    }

    if (typeof webhookSecret !== 'string' || webhookSecret.length === 0) {
      this.logging.error(
        'Export request is misconfigured: hostSettings:export:webhookSecret is missing while hostSettings:export:webhookUrl is set.',
      );
      throw new errors.IncorrectUsageError({
        message: 'Export requests are not configured correctly on this site',
      });
    }

    const normalizedSiteId =
      typeof siteId === 'string' ? siteId : typeof siteId === 'number' ? String(siteId) : '';

    if (normalizedSiteId.length === 0) {
      this.logging.error(
        'Export request is misconfigured: hostSettings:siteId is missing while hostSettings:export:webhookUrl is set.',
      );
      throw new errors.IncorrectUsageError({
        message: 'Export requests are not configured correctly on this site',
      });
    }

    const payload: ExportRequestBody = {
      type: 'export',
      siteId: normalizedSiteId,
      components,
      requestedByUserId,
    };

    // Sent once, as each delivery can schedule an export: got never retries a
    // POST, only the GET that may follow a 303.
    const requestOptions = buildSignedWebhookRequest({
      payload,
      secret: webhookSecret,
    });

    const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);
    this.logging.info(`Requesting export generation from "${sanitizedUrl}"`);

    try {
      await this.request(webhookUrl, requestOptions);
    } catch (error) {
      const message = describeWebhookError(error);
      this.logging.error(`Failed to request export generation from "${sanitizedUrl}": ${message}`);
      throw new errors.InternalServerError({
        statusCode: 502,
        message: 'Failed to start the export. Please try again later.',
      });
    }
  }
}

export const requestExport = (site: Site) =>
  new RequestExport({
    config: site.config,
    logging: site.log,
    // The signed request's headers hold a number, which the client's types do not
    // allow. It has always been sent this way; the untyped import used to hide it.
    request: request(site) as RequestExportDeps['request'],
  });
