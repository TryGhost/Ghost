import { useState } from "react";
import { Banner, LucideIcon } from "@tryghost/shade";
import { useWhatsNew, useDismissWhatsNew } from "@/whats-new/hooks/use-whats-new";
import { useChangelog } from "@/whats-new/hooks/use-changelog";

function WhatsNewBanner() {
    const { data: whatsNewData } = useWhatsNew();
    const { data: changelog } = useChangelog();
    const { mutate: dismissWhatsNew } = useDismissWhatsNew();
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't show if dismissed or no new content
    if (isDismissed || !whatsNewData?.hasNew) {
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

    const handleLinkClick = () => {
        // Mark as seen when navigating to the changelog
        dismissWhatsNew();
    };

    return (
        <Banner
            data-test-toast="whats-new"
            className="mx-2"
            role="status"
            aria-label="What’s new notification"
            aria-live="polite"
            variant="gradient"
            dismissible
            onDismiss={handleDismiss}
        >
            <a
                href={latestEntry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block pr-8"
                onClick={handleLinkClick}
                data-test-toast-link
            >
                <div className="flex items-center gap-2 mb-2">
                    <LucideIcon.Sparkles className="size-4 text-purple-600 dark:text-purple" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide">What’s new?</span>
                </div>
                <div className="text-base font-semibold text-gray-900 dark:text-foreground mb-1" data-test-toast-title>
                    {latestEntry.title}
                </div>
                <div className="text-sm text-gray-700" data-test-toast-excerpt>
                    {latestEntry.customExcerpt}
                </div>
            </a>
        </Banner>
    );
}

export default WhatsNewBanner;
