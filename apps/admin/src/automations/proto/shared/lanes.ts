// ---------------------------------------------------------------------------
// Lanes.
//
// The prototype used to be one set of screens with a `phase` variant flipping
// them, held in localStorage. That gave a reviewer a demo control, but it gave
// engineers nothing: three people building across two phases were all reading
// the same components, so a change meant for one lane could — and repeatedly
// did — land in another, and there was no link anyone could be sent that was
// theirs.
//
// A lane is now a route with its own copy of the screens. Two properties follow
// that the variant switcher couldn't give:
//
//   Isolation. Phase 2's screens are different files. An edit there cannot reach
//   Phase 1 by accident, which is the failure this exists to prevent.
//
//   Address. Each lane has a URL. "Here's your lane" is a link, not an
//   instruction to open a menu and pick the right entry.
//
// The cost is drift — a fix in one lane doesn't reach the others. That's
// deliberate: Phase 1's job is to hold still while Phase 2 moves, and sharing
// the screens would optimise for exactly the thing we don't want. What IS shared
// is everything under shared/ and canvas/ — data, the store, node rendering, the
// flow mechanics. Mechanics are common; screens diverge.
// ---------------------------------------------------------------------------

export type LaneId = 'phase-1' | 'phase-2' | 'phase-3' | 'exploration-2';

// Where a lane stands: shipped and holding still, or still moving. Shown as a
// badge beside the lane's name in the switcher.
export type LaneStatus = 'done' | 'in-progress';

export interface Lane {
  id: LaneId;
  label: string;
  status: LaneStatus;
}

// The labels say what the lane is; `status` says where it stands. The ids, and
// so the URLs and folders, keep their original names: only the words in the
// switcher changed, so nobody's link moved.
//
// Two lanes were retired in Oct '26 and are in the branch history if wanted:
// "Sandbox: Full canvas" (exploration), the disappearing-chrome concept, and
// "Future: Next & Later" (future), the roadmap lane — its triggers, its Update
// member step and its publish checks all live in GA now.
export const LANES: Lane[] = [
  { id: 'phase-1', label: 'Automation analytics', status: 'done' },
  { id: 'phase-2', label: 'Tier-based welcome sequences', status: 'in-progress' },
  // Forked from phase-2 as an exact copy, so phase 2 can be locked while this
  // one keeps moving.
  { id: 'phase-3', label: 'Lifecycle triggers', status: 'in-progress' },
  // Formerly "Sandbox: Right panel": the post editor's shape, a fixed header and
  // the pane on the canvas's right, carrying everything on the roadmap to GA.
  { id: 'exploration-2', label: 'Automations 1.0 (GA)', status: 'in-progress' },
];

export const lanePath = (lane: LaneId): string => `/automations-proto/${lane}`;

export const laneLabel = (lane: LaneId): string =>
  LANES.find((entry) => entry.id === lane)?.label ?? lane;
