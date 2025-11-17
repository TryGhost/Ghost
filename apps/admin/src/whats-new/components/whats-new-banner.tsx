import { useState } from "react";
import { Banner, LucideIcon } from "@tryghost/shade";
import { useWhatsNew, useDismissWhatsNew } from "@/whats-new/hooks/use-whats-new";
import { useChangelog } from "@/whats-new/hooks/use-changelog";

function WhatsNewBanner() {
    const { data: whatsNewData } = useWhatsNew();
    const { data: changelog } = useChangelog();
    const { mutate: dismissWhatsNew } = useDismissWhatsNew();
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't show if dismissed or no featured content
    if (isDismissed || !whatsNewData?.hasNewFeatured) {
        return null;
    }

    const latestEntry = changelog?.entries[0];
    if (!latestEntry) {
        return null;
    }

    const handleDismiss = () => {
        setIsDismissed(true);
        dismissWhatsNew();
    };

    const handleClick = () => {
        // Mark as seen when navigating to the changelog
        dismissWhatsNew();
        // Open the changelog entry in a new tab
        window.open(latestEntry.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <Banner
            className="cursor-pointer"
            data-test-toast="whats-new"
            role="status"
            aria-label="What's new notification"
            aria-live="polite"
            variant="gradient"
            dismissible
            onDismiss={handleDismiss}
            onClick={handleClick}
        >
            <div className="pr-8" data-test-toast-link>
                <div className="flex items-center gap-2 mb-2">
                    <LucideIcon.Sparkles className="size-4 text-purple-600" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">What's new?</span>
                </div>
                <div className="text-base font-semibold text-gray-900 mb-1" data-test-toast-title>
                    {latestEntry.title}
                </div>
                <div className="text-sm text-gray-700" data-test-toast-excerpt>
                    {latestEntry.customExcerpt}
                </div>
            </div>
        </Banner>
    );
}

export default WhatsNewBanner;
