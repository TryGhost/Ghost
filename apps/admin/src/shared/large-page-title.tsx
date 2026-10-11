import React from 'react';
import { LARGE_TITLE_HEADER_OVERLAP } from './large-page-title-layout';

interface LargePageTitleProps {
  /** Marks where the sticky header sits at rest (see useLargeTitleCondense). */
  markerRef: (element: HTMLElement | null) => void;
  /** Beside the title, e.g. a count. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A list screen's large title, in the flow above its sticky header, which is
 * pulled up beside it (LARGE_TITLE_HEADER_OVERLAP). Scrolling, it fades as it
 * nears the header's sticking point, and the header's own small title takes
 * over (useLargeTitleCondense). It keeps its size throughout. Needs
 * LARGE_PAGE_TITLE_VARIABLES on an ancestor.
 */
export function LargePageTitle({ markerRef, aside, children }: LargePageTitleProps) {
  return (
    <div className="relative" style={{ paddingTop: 'var(--large-title-space)' }}>
      <h1
        className="flex items-baseline gap-3 leading-[1.15] font-medium tracking-[-0.03em] whitespace-nowrap"
        style={{
          fontSize: 'var(--large-title-size)',
          // Gone over the first part of the handover, before the small title is in
          opacity: 'clamp(0, calc(1 - var(--large-title-condense) * 1.6), 1)',
        }}
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
