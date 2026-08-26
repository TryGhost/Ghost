import MembersListItem from './members-list-item';
import {
  LoadMoreButton,
  useInfiniteVirtualScroll,
  useScrollRestoration,
  useVirtualListWindow,
} from '@/shared/virtual-list';
import { type Member } from '@tryghost/admin-x-framework/api/members';
import {
  MembersTableColGroup,
  MembersTableHeader,
  PinnedMemberHeader,
} from './member-table-chrome';
import { Table, TableBody, TableCell, TableRow } from '@tryghost/shade/components';
import { buildMemberDetailPath } from '@/members/member-detail-hash';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { getMemberTableLayout, getMemberTableLayoutStyles } from './member-table-layout';
import type { MemberActiveColumn } from '@/members/member-query-params';
import type { RefObject } from 'react';

const SpacerRow = ({ height }: { height: number }) => (
  <tr aria-hidden="true" style={{ height }}>
    <td colSpan={999} />
  </tr>
);

const PlaceholderRow = forwardRef<HTMLTableRowElement>(function PlaceholderRow(props, ref) {
  return (
    <TableRow ref={ref} {...props} aria-hidden="true">
      <TableCell className="h-[72px] px-4 py-3" colSpan={999}>
        <div
          className="h-full animate-pulse rounded-md bg-muted"
          data-testid="loading-placeholder"
        />
      </TableCell>
    </TableRow>
  );
});

interface MembersListProps {
  items: Member[];
  totalItems: number;
  backPath?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
  isLoading?: boolean;
  showEmailOpenRate?: boolean;
  activeColumns: MemberActiveColumn[];
  timezone: string;
  pageHeaderRef?: RefObject<HTMLElement | null>;
  onRowClick?: (memberId: string) => void;
}

function MembersList({
  items,
  totalItems,
  backPath,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  showEmailOpenRate = true,
  activeColumns,
  timezone,
  pageHeaderRef,
  onRowClick,
}: MembersListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLTableSectionElement>(null);
  const pinnedHeaderRef = useRef<HTMLDivElement>(null);
  const scrollingMemberHeaderRef = useRef<HTMLTableCellElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const [showPinnedEdge, setShowPinnedEdge] = useState(false);
  const { visibleItemCount, canLoadMore, loadMore } = useVirtualListWindow(totalItems);
  const layout = useMemo(() => {
    return getMemberTableLayout({
      showEmailOpenRate,
      activeColumnCount: activeColumns.length,
    });
  }, [activeColumns.length, showEmailOpenRate]);
  const { tableStyle, columnStyles } = useMemo(() => getMemberTableLayoutStyles(layout), [layout]);

  useScrollRestoration({ parentRef, isLoading });

  useEffect(() => {
    const scrollElement = horizontalScrollRef.current;

    if (!scrollElement) {
      return;
    }

    const updatePinnedEdge = () => {
      const scrollLeft = scrollElement.scrollLeft;
      setShowPinnedEdge(scrollLeft > 0);

      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollLeft;
      }
    };

    updatePinnedEdge();
    scrollElement.addEventListener('scroll', updatePinnedEdge, { passive: true });
    window.addEventListener('resize', updatePinnedEdge);

    return () => {
      scrollElement.removeEventListener('scroll', updatePinnedEdge);
      window.removeEventListener('resize', updatePinnedEdge);
    };
  }, [activeColumns.length, items.length, showEmailOpenRate]);

  useEffect(() => {
    const pageHeader = pageHeaderRef?.current;
    const stickyHeader = stickyHeaderRef.current;
    const scrollingMemberHeader = scrollingMemberHeaderRef.current;
    const stickyRoot = pinnedHeaderRef.current;

    if (!pageHeader || !stickyHeader || !scrollingMemberHeader || !stickyRoot) {
      return;
    }

    const initialPaddingBottom = pageHeader.style.paddingBottom;
    const initialMarginBottom = pageHeader.style.marginBottom;
    const basePaddingBottom = parseFloat(getComputedStyle(pageHeader).paddingBottom) || 0;
    const baseMarginBottom = parseFloat(getComputedStyle(pageHeader).marginBottom) || 0;
    const desktop = window.matchMedia('(min-width: 1024px)');

    // Read once before any writes. Subsequent resize notifications already
    // contain border-box dimensions; measuring again would force layout during
    // each frame of the sidebar's width transition.
    let pageHeaderHeight = pageHeader.getBoundingClientRect().height;
    let stickyHeaderHeight = stickyHeader.getBoundingClientRect().height;
    let memberHeaderWidth = scrollingMemberHeader.getBoundingClientRect().width;
    let extraHeaderPadding = 0;

    const setStyle = (element: HTMLElement, property: string, value: string, priority = '') => {
      if (
        element.style.getPropertyValue(property) !== value ||
        element.style.getPropertyPriority(property) !== priority
      ) {
        element.style.setProperty(property, value, priority);
      }
    };

    const resetHeaderSpacing = () => {
      if (initialPaddingBottom) {
        setStyle(pageHeader, 'padding-bottom', initialPaddingBottom);
      } else {
        pageHeader.style.removeProperty('padding-bottom');
      }
      if (initialMarginBottom) {
        setStyle(pageHeader, 'margin-bottom', initialMarginBottom);
      } else {
        pageHeader.style.removeProperty('margin-bottom');
      }
    };

    const updateStickyPosition = () => {
      if (!desktop.matches) {
        resetHeaderSpacing();
        pageHeaderHeight -= extraHeaderPadding;
        extraHeaderPadding = 0;
        stickyRoot.style.removeProperty('--members-sticky-column-width');
        stickyRoot.style.removeProperty('--members-sticky-top');
        return;
      }

      // Account for the padding already represented in the observed size before
      // changing it. A wrapping header can change height while its width moves.
      const stickyTop = Math.max(pageHeaderHeight - extraHeaderPadding, 0);
      setStyle(
        pageHeader,
        'padding-bottom',
        `${basePaddingBottom + stickyHeaderHeight}px`,
        'important',
      );
      setStyle(
        pageHeader,
        'margin-bottom',
        `${baseMarginBottom - stickyHeaderHeight}px`,
        'important',
      );
      pageHeaderHeight += stickyHeaderHeight - extraHeaderPadding;
      extraHeaderPadding = stickyHeaderHeight;

      // Geometry belongs to these elements, not React state: changing the pinned
      // column's width must not render every visible member row on every frame.
      setStyle(stickyRoot, '--members-sticky-column-width', `${memberHeaderWidth}px`);
      setStyle(stickyRoot, '--members-sticky-top', `${stickyTop}px`);
    };

    updateStickyPosition();

    const resizeObserver = new ResizeObserver((entries) => {
      // Collect the whole batch before writing so observer entry ordering cannot
      // turn a header-height change into a read/write feedback loop.
      for (const entry of entries) {
        const box = entry.borderBoxSize[0];
        const height = box?.blockSize ?? entry.target.getBoundingClientRect().height;
        if (entry.target === pageHeader) {
          pageHeaderHeight = height;
        } else if (entry.target === stickyHeader) {
          stickyHeaderHeight = height;
        } else if (entry.target === scrollingMemberHeader) {
          memberHeaderWidth = box?.inlineSize ?? entry.target.getBoundingClientRect().width;
        }
      }
      updateStickyPosition();
    });

    resizeObserver.observe(pageHeader);
    resizeObserver.observe(stickyHeader);
    resizeObserver.observe(scrollingMemberHeader);
    desktop.addEventListener('change', updateStickyPosition);

    return () => {
      resizeObserver.disconnect();
      desktop.removeEventListener('change', updateStickyPosition);
      resetHeaderSpacing();
      stickyRoot.style.removeProperty('--members-sticky-column-width');
      stickyRoot.style.removeProperty('--members-sticky-top');
    };
  }, [activeColumns.length, pageHeaderRef, showEmailOpenRate]);

  const { visibleItems, spaceBefore, spaceAfter } = useInfiniteVirtualScroll({
    items,
    totalItems: visibleItemCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    parentRef,
    estimateSize: () => 72, // Approximate row height
  });

  const navigate = useNavigate();

  const handleRowClick = (memberId: string) => {
    if (onRowClick) {
      onRowClick(memberId);
    } else {
      navigate(buildMemberDetailPath(memberId, backPath));
    }
  };

  return (
    <div ref={parentRef} className="w-full min-w-0" data-testid="members-list-scroll-root">
      <div
        ref={pinnedHeaderRef}
        className="sticky z-[50] hidden overflow-visible bg-transparent lg:block"
        style={{ top: 'var(--members-sticky-top, 0px)' }}
      >
        <div className="relative">
          <PinnedMemberHeader
            columnStyle={{
              ...columnStyles.member,
              width: `var(--members-sticky-column-width, ${columnStyles.member.width})`,
            }}
            showPinnedEdge={showPinnedEdge}
          />
          <div
            ref={headerScrollRef}
            className="w-full overflow-hidden"
            style={{ clipPath: 'inset(0 0 0 var(--members-sticky-column-width, 0px))' }}
          >
            <Table
              aria-hidden="true"
              className="w-full border-collapse lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
              style={tableStyle}
            >
              <MembersTableColGroup
                activeColumns={activeColumns}
                columnStyles={columnStyles}
                showEmailOpenRate={showEmailOpenRate}
              />
              <MembersTableHeader
                activeColumns={activeColumns}
                columnStyles={columnStyles}
                headerRef={stickyHeaderRef}
                memberHeaderRef={scrollingMemberHeaderRef}
                showEmailOpenRate={showEmailOpenRate}
              />
            </Table>
          </div>
        </div>
      </div>

      <div ref={horizontalScrollRef} className="w-full overflow-x-auto overflow-y-visible">
        <Table
          className="w-full border-collapse max-sm:table-fixed sm:max-lg:table-auto lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
          data-testid="members-list"
          style={tableStyle}
        >
          <MembersTableColGroup
            activeColumns={activeColumns}
            columnStyles={columnStyles}
            showEmailOpenRate={showEmailOpenRate}
          />
          <MembersTableHeader
            activeColumns={activeColumns}
            className="lg:h-0 lg:overflow-hidden lg:[&_th]:pointer-events-none lg:[&_th]:h-0 lg:[&_th]:border-0 lg:[&_th]:p-0 lg:[&_th]:text-[0px] lg:[&_th]:leading-none lg:[&_th]:opacity-0 lg:[&_tr]:h-0 lg:[&_tr]:border-0"
            columnStyles={columnStyles}
            showEmailOpenRate={showEmailOpenRate}
          />
          <TableBody>
            <SpacerRow height={spaceBefore} />
            {visibleItems.map(({ key, virtualItem, item, props }) => {
              const shouldRenderPlaceholder = virtualItem.index > items.length - 1;

              if (shouldRenderPlaceholder) {
                return <PlaceholderRow key={key} {...props} />;
              }

              return (
                <MembersListItem
                  key={key}
                  {...props}
                  activeColumns={activeColumns}
                  backPath={backPath}
                  columnStyles={columnStyles}
                  item={item}
                  showEmailOpenRate={showEmailOpenRate}
                  showPinnedEdge={showPinnedEdge}
                  timezone={timezone}
                  onClick={handleRowClick}
                />
              );
            })}
            <SpacerRow height={spaceAfter} />
          </TableBody>
        </Table>
      </div>

      {canLoadMore && <LoadMoreButton isLoading={isFetchingNextPage} onClick={loadMore} />}
    </div>
  );
}

export default MembersList;
