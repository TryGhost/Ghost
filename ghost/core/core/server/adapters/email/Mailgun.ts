import {
  EmailProviderBase,
  type EmailFamily,
  type EventSource,
  type NewsletterMessage,
  type SingleMessage,
  type SendingOptions,
  type EmailEvent,
} from '@tryghost/adapter-base-email';
// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../../services/lib/mailgun-client';
// @ts-expect-error This module lacks type definitions.
import MailgunEmailProvider from '../../services/email-service/mailgun-email-provider';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import settings from '../../../shared/settings-cache';
import { fetchMailgunEvents } from '../../services/email-analytics/fetch-mailgun-events';
import {
  getMailgunMessageId,
  normalizeMailgunMessageId,
} from '../../services/lib/mailgun-message-id';
import errors from '@tryghost/errors';

const tags: Record<EmailFamily, string> = {
  newsletters: 'bulk-email',
  automations: 'automation-email',
  gifts: 'gift-delivery',
};

/** Keeps Mailgun wire formats, envelopes, tags and error codes at the edge. */
export default class Mailgun extends EmailProviderBase {
  readonly source = 'mailgun';
  private readonly client = new MailgunClient({ config, settings });
  private readonly newsletters = new MailgunEmailProvider({ mailgunClient: this.client, config });

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  send(message: NewsletterMessage, options: SendingOptions): Promise<{ id: string | null }> {
    return this.newsletters.send(message, options);
  }

  async sendSingle(message: SingleMessage): Promise<{ id: string | null }> {
    const response = await this.client.send(
      {
        subject: message.subject,
        html: message.html,
        plaintext: message.text,
        from: message.from,
        replyTo: message.replyTo,
        tags: this.getTags(message.family),
        ...(typeof message.trackOpens === 'boolean' ? { track_opens: message.trackOpens } : {}),
        ...(message.disableTracking ? { disable_tracking: true } : {}),
      },
      {
        [message.to]: message.listUnsubscribe ? { list_unsubscribe: message.listUnsubscribe } : {},
      },
      [],
    );
    // The legacy client returns null without attempting a send when unconfigured.
    if (response === null) {
      throw new errors.EmailError({
        message: 'Mailgun is not configured',
        code: 'EMAIL_NOT_ACCEPTED',
      });
    }
    return { id: getMailgunMessageId(response) || null };
  }

  getMaximumRecipients(): number {
    return this.newsletters.getMaximumRecipients();
  }

  getTargetDeliveryWindow(): number {
    return this.newsletters.getTargetDeliveryWindow();
  }

  private getTags(family: EmailFamily): string[] {
    const custom = config.get('bulkEmail:mailgun:tag');
    return typeof custom === 'string' && custom.length ? [tags[family], custom] : [tags[family]];
  }

  getEventSource(): EventSource {
    return {
      type: 'poll',
      fetch: (options) =>
        fetchMailgunEvents({
          ...options,
          config,
          settings,
          tags: this.getTags(options.family),
          batchHandler: (events: Omit<EmailEvent, 'family' | 'suppress'>[]) =>
            options.batchHandler(
              events.map((event) => ({
                ...event,
                providerId: event.providerId ? normalizeMailgunMessageId(event.providerId) : '',
                family: options.family,
                suppress:
                  event.type === 'complained' ||
                  (event.type === 'failed' &&
                    event.severity === 'permanent' &&
                    (event.error?.code === 605 || event.error?.code === 607)),
              })),
            ),
        }),
    };
  }

  async removeSuppression(
    email: string,
    reason: 'bounce' | 'complaint' | 'unsubscribe',
  ): Promise<void> {
    const methods = {
      bounce: 'removeBounce',
      complaint: 'removeComplaint',
      unsubscribe: 'removeUnsubscribe',
    };
    await this.client[methods[reason]](email);
  }
}
