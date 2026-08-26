import { useChangelog } from '@/whats-new/hooks/use-changelog';
import { useWhatsNew } from '@/whats-new/hooks/use-whats-new';

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
