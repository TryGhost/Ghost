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

export type LaneId = 'phase-1' | 'phase-2' | 'exploration' | 'exploration-2';

export interface Lane {
  id: LaneId;
  label: string;
  // Shown under the label in the switcher. Says what the lane is FOR, because
  // the thing an engineer needs to know first is whether they're looking at
  // committed work or at someone thinking out loud.
  note: string;
}

export const LANES: Lane[] = [
  { id: 'phase-1', label: 'Phase 1', note: 'Being built now' },
  { id: 'phase-2', label: 'Phase 2', note: 'Per-tier automations — in design' },
  { id: 'exploration', label: 'Exploration', note: 'Not scheduled' },
  // A second exploration rather than edits to the first. The lanes exist so work can
  // diverge without anything being lost, and that applies to two ideas about the same
  // screen as much as it does to two phases — the first exploration is a state worth
  // being able to go back and look at, not a draft of this one.
  { id: 'exploration-2', label: 'Exploration 2', note: 'Not scheduled' },
];

export const lanePath = (lane: LaneId): string => `/automations-proto/${lane}`;

export const laneLabel = (lane: LaneId): string =>
  LANES.find((entry) => entry.id === lane)?.label ?? lane;
