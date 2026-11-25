import type { GhostLogger } from '@tryghost/logging';
import {
  buildSignedWebhookRequest,
  describeWebhookError,
  sanitizeWebhookUrl,
} from '../../lib/signed-webhook';

const DEFAULT_MAX_SITE_AGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

type Config = {
  get(key: string): unknown;
};

type UrlUtils = {
  getSiteUrl(): string;
};

type RequestFn = (url: string, options: unknown) => Promise<unknown>;

type SettingsModel = {
  get(field: string): unknown;
};

type ModelEventListener = (model: SettingsModel, options?: { importing?: boolean }) => void;

type ModelEvents = {
  removeListener(event: string, listener: ModelEventListener): ModelEvents;
  on(event: string, listener: ModelEventListener): ModelEvents;
};

type SiteTitleChangedBody = {
  type: 'site.title_changed';
  siteId: string;
  siteUrl: string;
  siteCreatedAt: string;
  title: string;
};

export type ContentVerificationServiceDeps = {
  config: Config;
  logging: Pick<GhostLogger, 'info' | 'warn' | 'error'>;
  request: RequestFn;
  urlUtils: UrlUtils;
  events: ModelEvents;
};

/**
 * Posts signed content-verification events to the host Worker. Title changes
 * are fire-and-forget so a settings save never waits on or fails from delivery.
 */
export class ContentVerificationService {
  config: Config;
  logging: Pick<GhostLogger, 'info' | 'warn' | 'error'>;
  request: RequestFn;
  urlUtils: UrlUtils;
  events: ModelEvents;
  listener: ModelEventListener;

  constructor({ config, logging, request, urlUtils, events }: ContentVerificationServiceDeps) {
    this.config = config;
    this.logging = logging;
    this.request = request;
    this.urlUtils = urlUtils;
    this.events = events;
    this.listener = this.handleTitleEdited.bind(this);
  }

  handleTitleEdited(model: SettingsModel, options?: { importing?: boolean }): void {
    if (options?.importing) {
      return;
    }

    void this.sendTitleChanged(model).catch(() => {
      // Errors are logged inside sendTitleChanged; this catch prevents
      // unhandled rejection warnings from the fire-and-forget call.
    });
  }

  async sendTitleChanged(model: SettingsModel): Promise<void> {
    try {
      const webhookUrl = this.config.get('hostSettings:contentVerification:webhookUrl');
      if (typeof webhookUrl !== 'string' || webhookUrl.length === 0) {
        return;
      }

      const webhookSecret = this.config.get('hostSettings:contentVerification:webhookSecret');
      const siteIdRaw = this.config.get('hostSettings:siteId');
      const siteCreatedAtRaw = this.config.get('hostSettings:contentVerification:siteCreatedAt');
      const maxSiteAgeDaysRaw = this.config.get('hostSettings:contentVerification:maxSiteAgeDays');

      const siteId =
        typeof siteIdRaw === 'string'
          ? siteIdRaw
          : typeof siteIdRaw === 'number'
            ? String(siteIdRaw)
            : '';
      const webhookSecretValue = typeof webhookSecret === 'string' ? webhookSecret : '';
      const siteCreatedAt = this.#normalizeSiteCreatedAt(siteCreatedAtRaw);

      if (!webhookSecretValue || !siteId || !siteCreatedAt) {
        this.logging.warn(
          'Content verification webhook is misconfigured: hostSettings:contentVerification:webhookUrl is set but webhookSecret, siteId, or siteCreatedAt is missing.',
        );
        return;
      }

      const titleRaw = model.get('value');
      const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
      if (title.length === 0) {
        return;
      }

      const maxSiteAgeDays = this.#readMaxSiteAgeDays(maxSiteAgeDaysRaw);
      const createdAtMs = Date.parse(siteCreatedAt);
      if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs >= maxSiteAgeDays * DAY_MS) {
        return;
      }

      const payload: SiteTitleChangedBody = {
        type: 'site.title_changed',
        siteId,
        siteUrl: this.urlUtils.getSiteUrl(),
        siteCreatedAt,
        title,
      };

      const requestOptions = buildSignedWebhookRequest({
        payload,
        secret: webhookSecretValue,
      });

      const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);
      this.logging.info(`Triggering content verification webhook to "${sanitizedUrl}"`);

      try {
        // Got excludes POST from retries by default; include it explicitly.
        await this.request(webhookUrl, {
          ...requestOptions,
          retry: { limit: 2, methods: ['POST'] },
        });
      } catch (error) {
        const message = describeWebhookError(error);
        this.logging.error(
          `Failed to send content verification webhook to "${sanitizedUrl}": ${message}`,
        );
      }
    } catch (error) {
      this.logging.error(error as Error);
    }
  }

  subscribeEvents(): void {
    this.events
      .removeListener('settings.title.edited', this.listener)
      .on('settings.title.edited', this.listener);
  }

  unsubscribeEvents(): void {
    this.events.removeListener('settings.title.edited', this.listener);
  }

  #normalizeSiteCreatedAt(value: unknown): string | null {
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) {
        return null;
      }
      return new Date(parsed).toISOString();
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    return null;
  }

  #readMaxSiteAgeDays(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_MAX_SITE_AGE_DAYS;
  }
}
