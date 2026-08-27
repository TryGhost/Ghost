import { useChangelog, useWhatsNew } from '@/whats-new/api';

export interface WhatsNewStatus {
  showWhatsNewBanner: boolean;
}

export function useWhatsNewStatus(): WhatsNewStatus {
  const { hasNew } = useWhatsNew();
  const { data: changelog } = useChangelog();
  const latestEntry = changelog?.entries[0];

  return {
    showWhatsNewBanner: hasNew && !!latestEntry,
  };
}
