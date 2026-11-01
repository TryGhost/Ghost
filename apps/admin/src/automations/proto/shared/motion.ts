// Motion tokens shared across the proto's lanes.
//
// One curve, so that two things moving in response to the same action look like
// one gesture rather than two animations that happen to overlap. The canvas's
// creation sequence and the performance pane both use it.
//
// A plain decelerate. `ease-out` sounds like the same thing but has a hard start,
// which reads as a nudge on something meant to look like it's settling; the
// hard-out curves in the other direction cover most of their distance in the first
// third and then creep, so a 300ms move reads as instant-then-crawling.
export const PROTO_EASE = 'ease-[cubic-bezier(0.22,0.61,0.36,1)]';
