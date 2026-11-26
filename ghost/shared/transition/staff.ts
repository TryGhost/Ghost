/** The legacy staff service, which renders and sends staff alert emails. It is ready once boot has started it. */
import { forSiteWhenAsked } from './for-site';

type StaffService = {
  emails: {
    renderHTML(template: string, data: object): Promise<string>;
    renderText(template: string, data: object): Promise<string>;
  };
};

export const staff = forSiteWhenAsked(
  (): StaffService => require('../../core/server/services/staff').default.service,
);
