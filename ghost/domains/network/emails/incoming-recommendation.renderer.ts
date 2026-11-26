import { EmailRecipient } from '../services/incoming-recommendation.service';
import { IncomingRecommendation } from '../services/incoming-recommendation.service';
import type { Site } from '#support/site';
import { staff } from '../../../shared/transition/staff';

type StaffService = {
  api: {
    emails: {
      renderHTML(template: string, data: unknown): Promise<string>;
      renderText(template: string, data: unknown): Promise<string>;
    };
  };
};

export class IncomingRecommendationEmailRenderer {
  #staffService: StaffService;

  constructor({ staffService }: { staffService: StaffService }) {
    this.#staffService = staffService;
  }

  async renderSubject(recommendation: IncomingRecommendation) {
    return `👍 New recommendation: ${recommendation.title}`;
  }

  async renderHTML(recommendation: IncomingRecommendation, recipient: EmailRecipient) {
    return this.#staffService.api.emails.renderHTML('recommendation-received', {
      recommendation,
      recipient,
    });
  }

  async renderText(recommendation: IncomingRecommendation, recipient: EmailRecipient) {
    return this.#staffService.api.emails.renderText('recommendation-received', {
      recommendation,
      recipient,
    });
  }
}

export const incomingRecommendationEmailRenderer = (site: Site) =>
  new IncomingRecommendationEmailRenderer({
    // The staff service is read for each email, as it always has been.
    staffService: {
      get api() {
        return staff(site);
      },
    },
  });
