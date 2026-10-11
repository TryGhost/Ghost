import React from 'react';
import { LARGE_TITLE_HANDOVER, LARGE_TITLE_HEADER_OVERLAP } from './large-page-title-layout';

interface LargePageTitleProps {
  /** The handover's marker, across where the header sticks (see useLargeTitleCondense). */
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
        data-large-title=""
        style={{ fontSize: 'var(--large-title-size)' }}
      >
        {children}
        {aside && (
          <span className="text-base font-normal tracking-normal text-muted-foreground">
            {aside}
          </span>
        )}
      </h1>
      {/* Spans the handover: its top at half of it before where the header
        sits at rest (so sticks), its bottom half of it after */}
      <div
        ref={markerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0"
        data-large-title-marker=""
        style={{
          bottom: `calc(${LARGE_TITLE_HEADER_OVERLAP} - ${LARGE_TITLE_HANDOVER / 2}px)`,
          height: LARGE_TITLE_HANDOVER,
        }}
      />
    </div>
  );
}
