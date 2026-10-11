import React from 'react';
import { cn } from '@tryghost/shade/utils';
import { LARGE_TITLE_HEADER_OVERLAP } from './large-page-title-layout';

interface LargePageTitleProps {
  /** Set once the sticky header below has stuck: the title gives way to its small one. */
  condensed: boolean;
  /** Marks where the sticky header sits at rest (see useScrolledPast). */
  markerRef: (element: HTMLElement | null) => void;
  /** Beside the title, e.g. a count. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A list screen's large title, in the flow above its sticky header, which is
 * pulled up beside it (LARGE_TITLE_HEADER_OVERLAP). Scrolling, it passes under
 * the header and fades as the header's own small title takes over. Needs
 * LARGE_PAGE_TITLE_VARIABLES on an ancestor.
 */
export function LargePageTitle({ condensed, markerRef, aside, children }: LargePageTitleProps) {
  return (
    <div className="relative" style={{ paddingTop: 'var(--large-title-space)' }}>
      <h1
        className={cn(
          'flex items-baseline gap-3 leading-[1.15] font-medium tracking-[-0.03em] whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none',
          condensed && 'opacity-0',
        )}
        style={{ fontSize: 'var(--large-title-size)' }}
      >
        {children}
        {aside && (
          <span className="text-base font-normal tracking-normal text-muted-foreground">
            {aside}
          </span>
        )}
      </h1>
      <div
        ref={markerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-px"
        style={{ bottom: LARGE_TITLE_HEADER_OVERLAP }}
      />
    </div>
  );
}
