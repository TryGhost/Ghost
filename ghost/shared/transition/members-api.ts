/** The legacy members API: one site's members, their events and their subscriptions. It is ready once boot has started members. */
import { forSiteWhenAsked } from './for-site';

type SignupEventsPage = {
  data: unknown[];
  meta: { pagination: { total: number; limit: number } };
};

type MembersApi = {
  events: {
    getSignupEvents(options: object, filter: object): Promise<SignupEventsPage>;
  };
};

export const membersApi = forSiteWhenAsked(
  (): MembersApi => require('../../core/server/services/members').api,
);
