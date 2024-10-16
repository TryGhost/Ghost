import {EmailRecipient} from './IncomingRecommendationService';
import {IncomingRecommendation} from './IncomingRecommendationService';

type StaffService = {
    api: {
        emails: {
            renderHTML(template: string, data: unknown): Promise<string>,
            renderText(template: string, data: unknown): Promise<string>
        }
    }
}

export class IncomingRecommendationEmailRenderer {
    #staffService: StaffService;

    constructor({staffService}: {staffService: StaffService}) {
        this.#staffService = staffService;
    }

    async renderSubject(recommendation: IncomingRecommendation) {
        return `👍 New recommendation: ${recommendation.title}`;
    }

    async renderHTML(recommendation: IncomingRecommendation, recipient: EmailRecipient) {
        return this.#staffService.api.emails.renderHTML('recommendation-received', {
            recommendation,
            recipient
        });
    }

    async renderText(recommendation: IncomingRecommendation, recipient: EmailRecipient) {
        return this.#staffService.api.emails.renderText('recommendation-received', {
            recommendation,
            recipient
        });
    }
};
