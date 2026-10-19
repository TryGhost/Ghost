import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Stack } from '@/components/primitives/stack';
import { PageHeaderLargeTitleContext } from '@/components/patterns/page-header-large-title';
import { cn } from '@/lib/utils';
import {
  LARGE_TITLE_HANDOVER,
  LARGE_TITLE_HEADER_OVERLAP,
  useLargeTitleCondense,
  usePageChrome,
  useScrolledPast,
} from './large-page-title';

type ListPageProps = React.ComponentPropsWithoutRef<'div'>;

/** The list page's large title, for its header: on, and whether the header has stuck. */
const ListPageLargeTitleState = createContext<{
  active: boolean;
  condensed: boolean;
  headerRef?: (element: HTMLElement | null) => void;
}>({ active: false, condensed: false });

// Under a large title, the header is see-through until the title has handed
// over, then solid (a layer the handover fades in), with its padding set by
// LARGE_TITLE_HEADER_OVERLAP; overriding Admin's page chrome, hence important
const LARGE_TITLE_HEADER_CLASS_NAME =
  'bg-none! pt-4! pb-0! backdrop-blur-none! before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-background';

/**
 * Where a list page's title shows large (PageHeader.Title renders into it),
 * with the space above it and the markers its handover to the header is
 * measured by: one spanning the handover, one where the header sticks.
 */
function ListPageLargeTitleSlot({
  hidden,
  slotRef,
  handoverMarkerRef,
  stickMarkerRef,
}: {
  hidden: boolean;
  slotRef: (element: HTMLElement | null) => void;
  handoverMarkerRef: (element: HTMLElement | null) => void;
  stickMarkerRef: (element: HTMLElement | null) => void;
}) {
  return (
    <div
      className="relative"
      data-list-page="large-title"
      hidden={hidden}
      style={{ paddingTop: 'var(--large-title-space)' }}
    >
      <div ref={slotRef} />
      <div
        ref={hidden ? undefined : handoverMarkerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0"
        data-large-title-marker=""
        style={{
          bottom: `calc(${LARGE_TITLE_HEADER_OVERLAP} - ${LARGE_TITLE_HANDOVER / 2}px)`,
          height: LARGE_TITLE_HANDOVER,
        }}
      />
      <div
        ref={hidden ? undefined : stickMarkerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-px"
        style={{ bottom: LARGE_TITLE_HEADER_OVERLAP }}
      />
    </div>
  );
}

/**
 * Sticky, full-bleed header stack. Place `PageHeader`, `ViewBar`, and/or
 * `FilterBar` directly inside — they stack with a consistent gap.
 *
 * Full-bleed is achieved by negating the parent's horizontal padding
 * (`-mx-4 lg:-mx-8`) and re-applying it (`px-4 lg:px-8`), so the blurred
 * background spans edge-to-edge while content stays aligned with the body.
 *
 * Pass `sticky={false} blurredBackground={false}` to `PageHeader` when using
 * it here — stickiness and blur are handled by `ListPage.Header` instead.
 */
function ListPageHeader({ className, children, style, ...rest }: ListPageProps) {
  const { active, condensed, headerRef } = useContext(ListPageLargeTitleState);

  return (
    <Stack
      ref={headerRef}
      className={cn(
        '-mx-4 px-4 lg:-mx-5 lg:px-5',
        'sticky top-0 z-50',
        'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md',
        'py-5',
        className,
        active && LARGE_TITLE_HEADER_CLASS_NAME,
      )}
      data-condensed={active && condensed ? '' : undefined}
      data-large-title-header={active ? '' : undefined}
      data-list-page="header"
      gap="lg"
      // Pulled up beside the large title
      style={active ? { marginTop: `calc(-1 * ${LARGE_TITLE_HEADER_OVERLAP})`, ...style } : style}
      {...rest}
    >
      {children}
    </Stack>
  );
}

function ListPageBody({ className, children, ...rest }: ListPageProps) {
  return (
    <Stack
      className={cn('min-h-0 min-w-0 grow pb-4 lg:pb-8', className)}
      data-list-page="body"
      gap="none"
      {...rest}
    >
      {children}
    </Stack>
  );
}

type ListPageComponent = React.FC<ListPageProps> & {
  Header: React.FC<ListPageProps>;
  Body: React.FC<ListPageProps>;
};

/**
 * ListPage is the canonical recipe for the **List page** type — the recurring
 * structure used by Members, Tags, Comments, Automations, etc.
 *
 * It is intentionally thin: a vertical Stack with horizontal padding
 * that grows to fill its flex parent. Drop the named slots in as direct children.
 *
 * Composition:
 *  - `<ListPage.Header>` — sticky, blurred, full-bleed chrome band. Place
 *    `PageHeader`, `ViewBar`, and/or `FilterBar` directly inside as siblings.
 *    `FilterBar` auto-collapses when it has no active filters.
 *  - `<ListPage.Body>` — grows to fill remaining space. Use `flex-1 flex items-center justify-center`
 *    on the immediate child to vertically center empty/loading states.
 *
 * With large titles on (PageChromeProvider), the header's PageHeader.Title
 * also shows large above the header, with generous space above it. The
 * header is pulled up beside it, see-through, and as the page scrolls the
 * large title fades out, the header turns solid and sticks, and its own small
 * title fades in. A separator sits under the header's first row, unless a
 * FilterBar follows it, which takes its place. A page without a
 * PageHeader.Title keeps the usual header.
 */
const ListPage: ListPageComponent = Object.assign(
  function ListPage({ className, children, style, ...rest }: ListPageProps) {
    const { largeTitles } = usePageChrome();
    const [slot, setSlot] = useState<HTMLElement | null>(null);
    const [titles, setTitles] = useState(0);
    const registerTitle = useCallback(() => {
      setTitles((count) => count + 1);
      return () => setTitles((count) => count - 1);
    }, []);
    const active = largeTitles && titles > 0;
    const { markerRef: handoverMarkerRef } = useLargeTitleCondense();
    const { scrolledPast, markerRef: stickMarkerRef } = useScrolledPast();

    const largeTitle = useMemo(
      () => (largeTitles ? { slot, registerTitle } : null),
      [largeTitles, slot, registerTitle],
    );
    // The header's height (it doesn't change under a large title), for the
    // body's table labels to stick beneath it (styles.css). Only large titles
    // stick them, so it's left unset otherwise
    const [host, setHost] = useState<HTMLElement | null>(null);
    const [header, setHeader] = useState<HTMLElement | null>(null);
    useEffect(() => {
      if (!largeTitles || !host || !header || typeof ResizeObserver === 'undefined') {
        return;
      }
      const update = () =>
        host.style.setProperty('--list-page-header-height', `${header.offsetHeight}px`);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(header);
      return () => {
        observer.disconnect();
        host.style.removeProperty('--list-page-header-height');
      };
    }, [largeTitles, host, header]);

    const state = useMemo(
      () => ({ active, condensed: scrolledPast, headerRef: setHeader }),
      [active, scrolledPast],
    );

    return (
      <PageHeaderLargeTitleContext.Provider value={largeTitle}>
        <ListPageLargeTitleState.Provider value={state}>
          <Stack
            ref={setHost}
            className={cn('h-full min-h-0 grow px-4 lg:px-6', className)}
            data-large-title-host={largeTitles ? '' : undefined}
            data-list-page="list-page"
            gap="none"
            style={style}
            {...rest}
          >
            {largeTitles && (
              <ListPageLargeTitleSlot
                handoverMarkerRef={handoverMarkerRef}
                hidden={!active}
                slotRef={setSlot}
                stickMarkerRef={stickMarkerRef}
              />
            )}
            {children}
          </Stack>
        </ListPageLargeTitleState.Provider>
      </PageHeaderLargeTitleContext.Provider>
    );
  },
  {
    Header: ListPageHeader,
    Body: ListPageBody,
  },
);

export { ListPage, ListPageHeader, ListPageBody };
