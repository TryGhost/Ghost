import type { GhostLogger } from '@tryghost/logging';
import {
  buildSignedWebhookRequest,
  describeWebhookError,
  sanitizeWebhookUrl,
} from '../../lib/signed-webhook';

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

export type ContentCheckServiceDeps = {
  config: Config;
  logging: Pick<GhostLogger, 'info' | 'warn' | 'error'>;
  request: RequestFn;
  urlUtils: UrlUtils;
  events: ModelEvents;
};

export class ContentCheckService {
  config: Config;
  logging: Pick<GhostLogger, 'info' | 'warn' | 'error'>;
  request: RequestFn;
  urlUtils: UrlUtils;
  events: ModelEvents;
  listener: ModelEventListener;

  constructor({ config, logging, request, urlUtils, events }: ContentCheckServiceDeps) {
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

    this.sendTitleChanged(model).catch(() => {
      // Errors are already logged inside sendTitleChanged.
    });
  }

  async sendTitleChanged(model: SettingsModel): Promise<void> {
    try {
      const { webhookUrl, webhookSecret, siteId, siteCreatedAt, maxSiteAgeDays } =
        this.#readContentCheckConfig();

      if (!webhookUrl) {
        return;
      }

      if (!webhookSecret || !siteId || !siteCreatedAt || maxSiteAgeDays === null) {
        this.logging.warn(
          'Content check webhook is misconfigured: hostSettings:contentCheck:webhookUrl is set but webhookSecret, siteId, siteCreatedAt, or maxSiteAgeDays is missing.',
        );
        return;
      }

      const titleRaw = model.get('value');
      const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
      if (title.length === 0) {
        return;
      }

      const createdAtMs = Date.parse(siteCreatedAt);
      if (Date.now() - createdAtMs >= maxSiteAgeDays * DAY_MS) {
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
        secret: webhookSecret,
      });

      const sanitizedUrl = sanitizeWebhookUrl(webhookUrl);
      this.logging.info(`Triggering content check webhook to "${sanitizedUrl}"`);

      try {
        await this.request(webhookUrl, requestOptions);
      } catch (error) {
        const message = describeWebhookError(error);
        this.logging.error(`Failed to send content check webhook to "${sanitizedUrl}": ${message}`);
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

  #nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  #parseSiteId(siteId: unknown): string | null {
    const asString =
      typeof siteId === 'string'
        ? siteId
        : typeof siteId === 'number' && Number.isFinite(siteId)
          ? String(siteId)
          : null;
    return asString !== null && /^\d+$/.test(asString) ? asString : null;
  }

  #normalizeSiteCreatedAt(siteCreatedAt: unknown): string | null {
    const raw = this.#nonEmptyString(siteCreatedAt);
    if (raw === null) {
      return null;
    }
    const createdAtMs = Date.parse(raw);
    if (Number.isNaN(createdAtMs)) {
      return null;
    }
    return new Date(createdAtMs).toISOString();
  }

  #parseMaxSiteAgeDays(maxSiteAgeDays: unknown): number | null {
    return typeof maxSiteAgeDays === 'number' &&
      Number.isFinite(maxSiteAgeDays) &&
      maxSiteAgeDays > 0
      ? maxSiteAgeDays
      : null;
  }

  #readContentCheckConfig(): {
    webhookUrl: string | null;
    webhookSecret: string | null;
    siteId: string | null;
    siteCreatedAt: string | null;
    maxSiteAgeDays: number | null;
  } {
    return {
      webhookUrl: this.#nonEmptyString(this.config.get('hostSettings:contentCheck:webhookUrl')),
      webhookSecret: this.#nonEmptyString(
        this.config.get('hostSettings:contentCheck:webhookSecret'),
      ),
      siteId: this.#parseSiteId(this.config.get('hostSettings:siteId')),
      siteCreatedAt: this.#normalizeSiteCreatedAt(
        this.config.get('hostSettings:contentCheck:siteCreatedAt'),
      ),
      maxSiteAgeDays: this.#parseMaxSiteAgeDays(
        this.config.get('hostSettings:contentCheck:maxSiteAgeDays'),
      ),
    };
  }
}
