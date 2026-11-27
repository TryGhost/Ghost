import { useBrowseAutomationActionLinks } from '@tryghost/admin-x-framework/api/automations';
import { useEmailTrackingSettings } from '@/automations/hooks/use-email-tracking-settings';
import type { EmailCardAnalyticsData } from '@/automations/components/canvas/email-card-analytics';

// The API has no "has links" flag: an email with clicks has links, otherwise ask.
export const useEmailHasNoLinks = ({ automationId, actionId, stats }: EmailCardAnalyticsData) => {
  const { emailTrackClicks } = useEmailTrackingSettings();
  const unclicked = stats.email_clicked_count === 0;
  const { data } = useBrowseAutomationActionLinks(automationId, actionId, {
    defaultErrorHandler: false,
    enabled: emailTrackClicks && stats.email_sent_count > 0 && unclicked,
  });
  return unclicked && data?.automation_action_links.length === 0;
};
