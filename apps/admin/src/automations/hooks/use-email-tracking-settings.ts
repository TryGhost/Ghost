import { useEmailTrackClicks, useEmailTrackOpens } from '@tryghost/admin-x-framework/api/settings';

export const useEmailTrackingSettings = () => {
  const emailTrackOpens = useEmailTrackOpens() ?? false;
  const emailTrackClicks = useEmailTrackClicks() ?? false;

  return { emailTrackOpens, emailTrackClicks };
};
