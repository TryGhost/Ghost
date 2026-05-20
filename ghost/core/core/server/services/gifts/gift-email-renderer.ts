import {promises as fs} from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import type {GiftPurchaseConfirmationData} from './email-templates/gift-purchase-confirmation';
import {renderText as renderPurchaseConfirmationText} from './email-templates/gift-purchase-confirmation';
import type {GiftReminderData} from './email-templates/gift-reminder';
import {renderText as renderReminderText} from './email-templates/gift-reminder';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export class GiftEmailRenderer {
    private readonly handlebars: typeof Handlebars;
    private readonly t: Translate;

    private purchaseConfirmationTemplate: HandlebarsTemplateDelegate | null = null;
    private reminderTemplate: HandlebarsTemplateDelegate | null = null;

    constructor({t}: {t: Translate}) {
        this.t = t;
        this.handlebars = Handlebars.create();
        this.registerTemplateHelpers();
    }

    async renderPurchaseConfirmation(data: GiftPurchaseConfirmationData): Promise<{html: string; text: string}> {
        if (!this.purchaseConfirmationTemplate) {
            const source = await fs.readFile(path.join(__dirname, './email-templates/gift-purchase-confirmation.hbs'), 'utf8');

            this.purchaseConfirmationTemplate = this.handlebars.compile(source);
        }

        return {
            html: this.purchaseConfirmationTemplate(data),
            text: renderPurchaseConfirmationText(data, this.t)
        };
    }

    async renderReminder(data: GiftReminderData): Promise<{html: string; text: string}> {
        if (!this.reminderTemplate) {
            const source = await fs.readFile(path.join(__dirname, './email-templates/gift-reminder.hbs'), 'utf8');

            this.reminderTemplate = this.handlebars.compile(source);
        }

        return {
            html: this.reminderTemplate(data),
            text: renderReminderText(data, this.t)
        };
    }

    private registerTemplateHelpers(): void {
        this.handlebars.registerHelper('t', (key: string, options?: Handlebars.HelperOptions) => {
            const hash = options?.hash || {};
            const escapedHash = Object.entries(hash).reduce<Record<string, string>>((acc, [name, value]) => {
                acc[name] = this.htmlSafeInterpolationValue(value);
                return acc;
            }, {});

            return new Handlebars.SafeString(this.t(key, {
                ...escapedHash,
                interpolation: {escapeValue: false}
            }));
        });

        this.handlebars.registerHelper('strong', (value: unknown) => {
            return new Handlebars.SafeString(`<strong>${this.escape(value)}</strong>`);
        });

        this.handlebars.registerHelper('linkTag', (href: unknown, text: unknown, options?: Handlebars.HelperOptions) => {
            const className = options?.hash?.class ? ` class="${this.escape(options.hash.class)}"` : '';
            const style = options?.hash?.style ? ` style="${this.escape(options.hash.style)}"` : '';

            return new Handlebars.SafeString(`<a${className} href="${this.escape(href)}"${style}>${this.escape(text)}</a>`);
        });

        this.handlebars.registerHelper('mailto', (email: unknown) => `mailto:${email}`);
    }

    private htmlSafeInterpolationValue(value: unknown): string {
        if (this.isSafeString(value)) {
            return value.toHTML();
        }

        return this.escape(value);
    }

    private isSafeString(value: unknown): value is {toHTML(): string} {
        return Boolean(value && typeof value === 'object' && typeof (value as {toHTML?: unknown}).toHTML === 'function');
    }

    private escape(value: unknown): string {
        if (this.isSafeString(value)) {
            return value.toHTML();
        }

        return Handlebars.Utils.escapeExpression(String(value ?? ''));
    }
}
