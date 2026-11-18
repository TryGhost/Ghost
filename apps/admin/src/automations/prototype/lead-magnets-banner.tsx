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
// Label slug → name, for the labels added and removed.
type LabelNames = Record<string, string>;

// The banner's frame: the zap, then the text. Also used for the bulk add concept.
export const LeadMagnetBannerFrame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Banner className="pl-4 hover:shadow-sm" size="md">
    <Inline align="start" gap="sm">
      {/* One line tall (1lh), so the icon centres on the first line. */}
      <span className="flex h-[1lh] shrink-0 items-center text-sm" aria-hidden>
        <LucideIcon.Zap className="size-4" />
      </span>
      <Text as="p" size="sm">
        {children}
      </Text>
    </Inline>
  </Banner>
);

// The banner itself, for the member page and the patterns page.
export const LeadMagnetBannerBody: React.FC<Changes & { labelNames: LabelNames }> = ({
  starts,
  ends,
  labelNames,
}) => (
  <LeadMagnetBannerFrame>
    <LeadMagnetSaveSummary ends={ends} labelNames={labelNames} starts={starts} emphasis />
  </LeadMagnetBannerFrame>
);

// Opens and closes its content by animating its height (0fr to 1fr) and fading, so what's around
// it slides rather than jumps. Used in a parent whose children are spaced by gap-5: closed, a -5
// margin cancels that gap, above it (at the bottom of a stack) or below it (at the top, where the
// content also slides down into place). Keeps the last content while closing, so it doesn't
// vanish mid-animation.
// With `ownSpacing`, in a parent without that gap, it brings its own 20px above instead.
export const LeadMagnetReveal: React.FC<
  React.PropsWithChildren<{ open: boolean; from?: 'top' | 'bottom'; ownSpacing?: boolean }>
> = ({ open, from = 'bottom', ownSpacing = false, children }) => {
  const [shown, setShown] = React.useState(children);
  if (open && shown !== children) {
    setShown(children);
  }
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
        open && 'grid-rows-[1fr] opacity-100',
        !open && 'grid-rows-[0fr] opacity-0',
        !ownSpacing && !open && (from === 'top' ? '-mb-5' : '-mt-5'),
        ownSpacing && open && 'mt-5',
      )}
      {...(open ? {} : { inert: '' })}
    >
      {/* -m-1 p-1 gives the banner's shadow room inside the clip without moving it. */}
      <div
        className={cn(
          '-m-1 min-h-0 overflow-hidden p-1',
          from === 'top' &&
            'transition-transform duration-300 ease-out motion-reduce:transition-none',
          from === 'top' && !open && '-translate-y-2',
        )}
      >
        {open ? children : shown}
      </div>
    </div>
  );
};

// The member page's banner, open when saving would start or stop an automation.
export const LeadMagnetAnimatedBanner: React.FC<{ changes: Changes; labelNames: LabelNames }> = ({
  changes,
  labelNames,
}) => (
  <LeadMagnetReveal open={changes.starts.length > 0 || changes.ends.length > 0}>
    <LeadMagnetBannerBody {...changes} labelNames={labelNames} />
  </LeadMagnetReveal>
);

// On the member page, only when the prototype menu picks the banner. Removals say nothing.
export const LeadMagnetLabelsBanner: React.FC<{ changes: Changes; labelNames: LabelNames }> = ({
  changes,
  labelNames,
}) =>
  useHintStyle() === 'banner' ? (
    <LeadMagnetAnimatedBanner
      changes={{ starts: changes.starts, ends: [] }}
      labelNames={labelNames}
    />
  ) : null;
