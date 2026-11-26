import { useLayoutEffect, useRef } from 'react';
import { Grid, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useCanChangeMemberViews, useSidebarShowsAllSegments } from '@/members/api';
import { NavMenuItem } from './nav-menu-item';
import { NavSavedViews } from './nav-saved-views';
import { useMemberSidebarViews } from './member-sidebar-views';
import { SortableMemberViewRows, SortableMemberViews } from './sortable-member-views';

/** How many segments the sidebar shows before it folds the rest away. */
const SHOWN_WHEN_FOLDED = 5;

/**
 * The segments under Members. The sidebar shows the first few and folds the rest behind a row
 * that shows them, so a long list of segments can't push the rest of the sidebar out of view.
 * That matters most under the Admin 7 design, where the list opens whenever the members screen
 * does and can't be closed. The segment on screen always shows: past the fold, it is listed
 * with the first few while the rest are folded away.
 *
 * The rest unfold below the first few and fold away again as the sidebar's own lists open and
 * close, so "Show more" and "Show less" move like Members or Posts opening and closing.
 *
 * A list is folded only when that hides two segments or more: a row standing for one hidden
 * segment would take the room that segment needs.
 *
 * Staff who can change segments drag them into the site's order. While the rest are folded
 * away, the rows in view are the ones that can be dragged.
 */
export function NavMemberViews() {
  const memberViews = useMemberSidebarViews();
  const { showsAll, setShowsAll } = useSidebarShowsAllSegments();
  const canReorder = useCanChangeMemberViews();
  const Rows = canReorder ? SortableMemberViewRows : NavSavedViews;

  const folds = memberViews.length > SHOWN_WHEN_FOLDED + 1;
  // While the rest are folded away, the segment on screen joins the first few so it still
  // shows. With the rest shown, every segment keeps its place, so opening one never reorders
  // the list under the pointer.
  const first = folds
    ? memberViews.filter((view, index) => index < SHOWN_WHEN_FOLDED || (!showsAll && view.isActive))
    : memberViews;
  const rest = folds ? memberViews.filter((view) => !first.includes(view)) : [];

  // Folded away, the rest stay in place, so the space can close around their full height, and
  // out of reach of the keyboard and screen readers.
  const restRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (restRef.current) {
      restRef.current.inert = !showsAll;
    }
  }, [showsAll, folds]);

  const list = (
    <>
      <Rows views={first} />
      {folds && (
        <>
          {/* The same motion as the sidebar's lists opening and closing (Admin 7's). */}
          <Grid
            ref={restRef}
            aria-hidden={!showsAll || undefined}
            className={cn(
              'transition-[grid-template-rows] duration-260 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
              showsAll ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
            gap="none"
            id="member-views-rest"
          >
            <Stack
              className={cn(
                'min-h-0 overflow-hidden transition-opacity duration-150 motion-reduce:transition-none',
                showsAll ? 'opacity-100' : 'opacity-0',
              )}
              gap="none"
            >
              <Rows views={rest} />
            </Stack>
          </Grid>
          <NavMenuItem.SubmenuButton
            aria-controls="member-views-rest"
            aria-expanded={showsAll}
            onClick={() => setShowsAll(!showsAll)}
          >
            <NavMenuItem.Label>
              {showsAll ? 'Show less' : `Show ${rest.length} more`}
            </NavMenuItem.Label>
          </NavMenuItem.SubmenuButton>
        </>
      )}
    </>
  );

  return canReorder ? (
    <SortableMemberViews views={memberViews} visible={showsAll ? memberViews : first}>
      {list}
    </SortableMemberViews>
  ) : (
    list
  );
}
