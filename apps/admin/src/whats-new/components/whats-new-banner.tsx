import { useState } from 'react';
import { Banner } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useWhatsNew, useDismissWhatsNew } from '@/whats-new/hooks/use-whats-new';
import { useChangelog } from '@/whats-new/hooks/use-changelog';

function WhatsNewBanner() {
  const { hasNew } = useWhatsNew();
  const { data: changelog } = useChangelog();
  const { mutate: dismissWhatsNew } = useDismissWhatsNew();
  const [isDismissed, setIsDismissed] = useState(false);
  const admin7Design = useFeatureFlag('admin7Design');

  // Don't show if dismissed or no new content
  if (isDismissed || !hasNew) {
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
      aria-label="What’s new notification"
      aria-live="polite"
      className="mx-2"
      data-testid="whats-new-banner"
      role="status"
      variant={admin7Design ? 'info' : 'gradient'}
      dismissible
      onDismiss={handleDismiss}
    >
      <a
        className="block pr-8"
        href={latestEntry.url}
        rel="noopener noreferrer"
        target="_blank"
        onClick={handleLinkClick}
      >
        {admin7Design ? (
          <Stack gap="sm">
            <Inline gap="sm">
              <LucideIcon.Sparkles className="size-4 shrink-0 text-foreground" />
              <Text as="span" className="tracking-wide uppercase" size="xs" weight="semibold">
                What’s new?
              </Text>
            </Inline>
            <Stack gap="xs">
              <Text
                className="text-base tracking-tight"
                data-testid="whats-new-banner-title"
                weight="bold"
              >
                {latestEntry.title}
              </Text>
              <Text data-testid="whats-new-banner-excerpt" size="sm" tone="secondary">
                {latestEntry.customExcerpt}
              </Text>
            </Stack>
          </Stack>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <LucideIcon.Sparkles className="size-4 text-purple-600 dark:text-purple" />
              <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-400">
                What’s new?
              </span>
            </div>
            <div
              className="mb-1 text-base font-semibold text-gray-900 dark:text-foreground"
              data-testid="whats-new-banner-title"
            >
              {latestEntry.title}
            </div>
            <div className="text-sm text-gray-700" data-testid="whats-new-banner-excerpt">
              {latestEntry.customExcerpt}
            </div>
          </>
        )}
      </a>
    </Banner>
  );
}

export default WhatsNewBanner;
