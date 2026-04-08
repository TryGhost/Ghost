import {promises as fs} from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import type {GiftPurchaseConfirmationData} from './email-templates/gift-purchase-confirmation';
import {renderText as renderPurchaseConfirmationText} from './email-templates/gift-purchase-confirmation';

export class GiftEmailRenderer {
    private readonly handlebars: typeof Handlebars;

    private purchaseConfirmationTemplate: HandlebarsTemplateDelegate | null = null;

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
}
