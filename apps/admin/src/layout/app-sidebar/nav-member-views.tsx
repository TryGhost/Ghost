import { useSidebarShowsAllPins } from '@/members/api';
import { NavMenuItem } from './nav-menu-item';
import { NavSavedViews } from './nav-saved-views';
import { useMemberSidebarViews } from './member-sidebar-views';

/** How many pinned segments the sidebar shows before it folds the rest away. */
const SHOWN_WHEN_FOLDED = 5;

/**
 * The pinned segments under Members. The sidebar shows the first few and folds the rest behind
 * a row that shows them, so a long list of pins can't push the rest of the sidebar out of view.
 * That matters most under the Admin 7 design, where the list opens whenever the members screen
 * does and can't be closed. The segment on screen always shows, wherever it is in the list.
 *
 * A list is folded only when that hides two segments or more: a row standing for one hidden
 * segment would take the room that segment needs.
 */
export function NavMemberViews() {
  const memberViews = useMemberSidebarViews();
  const { showsAllPins, setShowsAllPins } = useSidebarShowsAllPins();

  const folds = memberViews.length > SHOWN_WHEN_FOLDED + 1;
  const shown =
    folds && !showsAllPins
      ? memberViews.filter((view, index) => index < SHOWN_WHEN_FOLDED || view.isActive)
      : memberViews;
  const hidden = memberViews.length - shown.length;

  return (
    <>
      <NavSavedViews views={shown} />
      {folds && (
        <NavMenuItem.SubmenuButton
          aria-expanded={showsAllPins}
          onClick={() => setShowsAllPins(!showsAllPins)}
        >
          <NavMenuItem.Label>
            {showsAllPins ? 'Show less' : `Show ${hidden} more`}
          </NavMenuItem.Label>
        </NavMenuItem.SubmenuButton>
      )}
    </>
  );
}
