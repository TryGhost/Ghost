// PROTOTYPE ONLY (NY-1750): an informational banner under the member page header, saying which
// label automations saving starts or stops for this member ("Banner under the header" in the
// prototype menu). Design review (2026-11-16) found the note under Labels read as if it had
// already happened, so this leads with saving and sits near the Save button. One sentence, shared with the
// one-sentence hint (lead-magnets-summary.tsx). Don't merge this
// folder.
import React from 'react';
import { Banner } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { LeadMagnetLabelChanges } from './lead-magnets';
import { useHintStyle } from './settings';
import { LeadMagnetSaveSummary } from './lead-magnets-summary';

type Changes = Pick<LeadMagnetLabelChanges, 'starts' | 'ends'>;

// The banner itself, for the member page and the patterns page.
export const LeadMagnetBannerBody: React.FC<Changes> = ({ starts, ends }) => (
  <Banner className="pl-4 hover:shadow-sm" size="md">
    <Inline align="start" gap="sm">
      {/* One line tall (1lh), so the icon centres on the first line. */}
      <span className="flex h-[1lh] shrink-0 items-center text-sm" aria-hidden>
        <LucideIcon.Zap className="size-4" />
      </span>
      <Text as="p" size="sm">
        <LeadMagnetSaveSummary ends={ends} starts={starts} emphasis />
      </Text>
    </Inline>
  </Banner>
);

// Opens when saving would start or stop an automation, and closes when it wouldn't. Used under a
// header whose children are spaced by gap-5.
export const LeadMagnetAnimatedBanner: React.FC<{ changes: Changes }> = ({ changes }) => {
  const isOpen = changes.starts.length > 0 || changes.ends.length > 0;
  // Keeps the last changes while the banner closes, so its text doesn't vanish mid-animation.
  const shownRef = React.useRef(changes);
  if (isOpen) {
    shownRef.current = changes;
  }
  return (
    // Opens and closes by animating its height (0fr to 1fr) and fading, so the page below slides
    // rather than jumps. Closed, -mt-5 cancels the header's gap above it.
    <div
      aria-hidden={!isOpen}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
        isOpen ? 'grid-rows-[1fr] opacity-100' : '-mt-5 grid-rows-[0fr] opacity-0',
      )}
      {...(isOpen ? {} : { inert: '' })}
    >
      {/* -m-1 p-1 gives the banner's shadow room inside the clip without moving it. */}
      <div className="-m-1 min-h-0 overflow-hidden p-1">
        <LeadMagnetBannerBody {...shownRef.current} />
      </div>
    </div>
  );
};

// On the member page, only when the prototype menu picks the banner.
export const LeadMagnetLabelsBanner: React.FC<{ changes: Changes }> = ({ changes }) =>
  useHintStyle() === 'banner' ? <LeadMagnetAnimatedBanner changes={changes} /> : null;
