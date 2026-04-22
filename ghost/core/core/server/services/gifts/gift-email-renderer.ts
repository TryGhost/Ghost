import {promises as fs} from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import type {GiftPurchaseConfirmationData} from './email-templates/gift-purchase-confirmation';
import {renderText as renderPurchaseConfirmationText} from './email-templates/gift-purchase-confirmation';
import type {GiftReminderData} from './email-templates/gift-reminder';
import {renderText as renderReminderText} from './email-templates/gift-reminder';

export class GiftEmailRenderer {
    private readonly handlebars: typeof Handlebars;

    private purchaseConfirmationTemplate: HandlebarsTemplateDelegate | null = null;
    private reminderTemplate: HandlebarsTemplateDelegate | null = null;

    constructor() {
        this.handlebars = Handlebars.create();
    }

    async renderPurchaseConfirmation(data: GiftPurchaseConfirmationData): Promise<{html: string; text: string}> {
        if (!this.purchaseConfirmationTemplate) {
            const source = await fs.readFile(path.join(__dirname, './email-templates/gift-purchase-confirmation.hbs'), 'utf8');

            this.purchaseConfirmationTemplate = this.handlebars.compile(source);
        }

        return {
            html: this.purchaseConfirmationTemplate(data),
            text: renderPurchaseConfirmationText(data)
        };
    }

    async renderReminder(data: GiftReminderData): Promise<{html: string; text: string}> {
        if (!this.reminderTemplate) {
            const source = await fs.readFile(path.join(__dirname, './email-templates/gift-reminder.hbs'), 'utf8');

            this.reminderTemplate = this.handlebars.compile(source);
        }

        return {
            html: this.reminderTemplate(data),
            text: renderReminderText(data)
        };
    }
}
