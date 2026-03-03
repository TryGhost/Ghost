import { useChangelog } from "@/whats-new/hooks/use-changelog";
import { useWhatsNew } from "@/whats-new/hooks/use-whats-new";

export interface WhatsNewStatus {
    showWhatsNewBanner: boolean;
}

export function useWhatsNewStatus(): WhatsNewStatus {
    const { data: whatsNewData } = useWhatsNew();
    const { data: changelog } = useChangelog();
    const latestEntry = changelog?.entries[0];

    return {
        showWhatsNewBanner: !!whatsNewData?.hasNew && !!latestEntry,
    };
}
