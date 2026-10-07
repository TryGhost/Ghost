import { promises as fs } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import type { GiftPurchaseConfirmationData } from './email-templates/gift-purchase-confirmation';
import { renderText as renderPurchaseConfirmationText } from './email-templates/gift-purchase-confirmation';
import type { GiftDeliveryFailureData } from './email-templates/gift-delivery-failure';
import { renderText as renderDeliveryFailureText } from './email-templates/gift-delivery-failure';
import type { GiftReminderData } from './email-templates/gift-reminder';
import { renderText as renderReminderText } from './email-templates/gift-reminder';
import type { GiftDeliveryEmailData } from './email-templates/gift-delivery';
import { renderText as renderDeliveryText } from './email-templates/gift-delivery';
import type { GiftSentConfirmationData } from './email-templates/gift-sent-confirmation';
import { renderText as renderSentConfirmationText } from './email-templates/gift-sent-confirmation';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export class GiftEmailRenderer {
  private readonly handlebars: typeof Handlebars;
  private readonly t: Translate;
  private readonly templates = new Map<string, Promise<HandlebarsTemplateDelegate>>();
  private readonly partials = new Map<string, Promise<void>>();

  constructor({ t }: { t: Translate }) {
    this.t = t;
    this.handlebars = Handlebars.create();
    this.registerTemplateHelpers();
  }

  async renderPurchaseConfirmation(
    data: GiftPurchaseConfirmationData,
  ): Promise<{ html: string; text: string }> {
    const template = await this.getTemplate('gift-purchase-confirmation.hbs');

    return {
      html: template(data),
      text: renderPurchaseConfirmationText(data, this.t),
    };
  }

  private async getTemplate(filename: string): Promise<HandlebarsTemplateDelegate> {
    let template = this.templates.get(filename);
    if (!template) {
      template = (async () => {
        await this.ensurePartial('giftBuyerNoticeLayout', 'gift-buyer-notice-layout.hbs');
        const source = await fs.readFile(
          path.join(__dirname, './email-templates', filename),
          'utf8',
        );
        return this.handlebars.compile(source);
      })();
      this.templates.set(filename, template);
    }

    return template;
  }

  private async ensurePartial(name: string, filename: string): Promise<void> {
    let registration = this.partials.get(name);
    if (!registration) {
      registration = fs
        .readFile(path.join(__dirname, './email-templates', filename), 'utf8')
        .then((source) => this.handlebars.registerPartial(name, source));
      this.partials.set(name, registration);
    }

    await registration;
  }

  async renderDeliveryFailure(
    data: GiftDeliveryFailureData,
  ): Promise<{ html: string; text: string }> {
    const template = await this.getTemplate('gift-delivery-failure.hbs');

    return {
      html: template(data),
      text: renderDeliveryFailureText(data, this.t),
    };
  }

  async renderReminder(data: GiftReminderData): Promise<{ html: string; text: string }> {
    const template = await this.getTemplate('gift-reminder.hbs');

    return {
      html: template(data),
      text: renderReminderText(data, this.t),
    };
  }

  async renderDelivery(data: GiftDeliveryEmailData): Promise<{ html: string; text: string }> {
    const template = await this.getTemplate('gift-delivery.hbs');

    return {
      html: template(data),
      text: renderDeliveryText(data, this.t),
    };
  }

  async renderSentConfirmation(
    data: GiftSentConfirmationData,
  ): Promise<{ html: string; text: string }> {
    const template = await this.getTemplate('gift-sent-confirmation.hbs');

    return {
      html: template(data),
      text: renderSentConfirmationText(data, this.t),
    };
  }

  private registerTemplateHelpers(): void {
    this.handlebars.registerHelper('t', (key: string, options?: Handlebars.HelperOptions) => {
      const hash = options?.hash || {};
      const escapedHash = Object.entries(hash).reduce<Record<string, unknown>>(
        (acc, [name, value]) => {
          acc[name] = typeof value === 'number' ? value : this.htmlSafeInterpolationValue(value);
          return acc;
        },
        {},
      );

      return new Handlebars.SafeString(
        this.t(key, {
          ...escapedHash,
          interpolation: { escapeValue: false },
        }),
      );
    });

    this.handlebars.registerHelper('strong', (value: unknown) => {
      return new Handlebars.SafeString(`<strong>${this.escape(value)}</strong>`);
    });

    this.handlebars.registerHelper(
      'linkTag',
      (href: unknown, text: unknown, options?: Handlebars.HelperOptions) => {
        const className = options?.hash?.class ? ` class="${this.escape(options.hash.class)}"` : '';
        const style = options?.hash?.style ? ` style="${this.escape(options.hash.style)}"` : '';

        return new Handlebars.SafeString(
          `<a${className} href="${this.escape(href)}"${style}>${this.escape(text)}</a>`,
        );
      },
    );

    this.handlebars.registerHelper('mailto', (email: unknown) => `mailto:${email}`);
  }

  private htmlSafeInterpolationValue(value: unknown): string {
    if (this.isSafeString(value)) {
      return value.toHTML();
    }

    return this.escape(value);
  }

  private isSafeString(value: unknown): value is { toHTML(): string } {
    return Boolean(
      value &&
      typeof value === 'object' &&
      typeof (value as { toHTML?: unknown }).toHTML === 'function',
    );
  }

  private escape(value: unknown): string {
    if (this.isSafeString(value)) {
      return value.toHTML();
    }

    return Handlebars.Utils.escapeExpression(String(value ?? ''));
  }
}
