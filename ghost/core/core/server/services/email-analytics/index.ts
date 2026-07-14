// @ts-expect-error This module lacks type definitions.
import EmailAnalyticsServiceWrapper from './email-analytics-service-wrapper';

export const newsletters = new EmailAnalyticsServiceWrapper();

export const init = () => {
    newsletters.init();
};
