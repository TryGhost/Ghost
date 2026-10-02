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

export type LaneId = 'phase-1' | 'phase-2' | 'future' | 'exploration' | 'exploration-2';

export interface Lane {
  id: LaneId;
  label: string;
}

// The labels carry the lane's status AND its concept in a few words — "Ph"
// lanes are scheduled work, "Sandbox" lanes are unscheduled thinking — which is
// what let the switcher drop its per-lane sub-copy: one line that says both is
// better than a title plus a caption saying them separately.
export const LANES: Lane[] = [
  { id: 'phase-1', label: 'Ph 1: Run analytics' },
  { id: 'phase-2', label: 'Ph 2: Per-tier' },
  // Everything after the current release — the roadmap's Next and Later columns,
  // through to the end of Feb 2027: new triggers (a label being added, a paid
  // subscription changing, a member entering a segment), actions that aren't an
  // email, a template library, and the still-open autosave question.
  //
  // A scheduled lane rather than a sandbox, hence the third "Ph"-style slot in
  // the list — this is work with a date on it, not thinking. It starts as a copy
  // of PHASE 2, because phase 2 is what will have shipped by the time any of it
  // is built: every card in those columns is a change to that screen, so basing
  // it on phase 1 would mean re-deriving per-tier triggers and CRUD before
  // anything new could start.
  { id: 'future', label: 'Future: Next & Later' },
  // "Full canvas": the disappearing-chrome concept — maximising takes the header
  // with it and the flow is the only thing on screen.
  { id: 'exploration', label: 'Sandbox: Full canvas' },
  // A second exploration rather than edits to the first. The lanes exist so work can
  // diverge without anything being lost, and that applies to two ideas about the same
  // screen as much as it does to two phases — the first exploration is a state worth
  // being able to go back and look at, not a draft of this one. "Right panel": the
  // post editor's shape, a fixed header and the pane on the canvas's right.
  { id: 'exploration-2', label: 'Sandbox: Right panel' },
];

export const lanePath = (lane: LaneId): string => `/automations-proto/${lane}`;

export const laneLabel = (lane: LaneId): string =>
  LANES.find((entry) => entry.id === lane)?.label ?? lane;
