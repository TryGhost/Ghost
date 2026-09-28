import type { LaneId } from './lanes';
import {
  SIMPLE_TRIGGER_OPTIONS,
  TRIGGER_PICKER_OPTIONS,
  type TriggerConfig,
  type TriggerType,
} from './trigger-config';

// ---------------------------------------------------------------------------
// Lane capabilities — what exists in a lane's world.
//
// The lanes split the SCREENS (see lanes.ts): each owns its files, so an edit
// meant for one can't reach another. What they can't split is the mechanics
// underneath — the store, the fixtures, the canvas, the trigger vocabulary —
// which are deliberately shared, because forking a 1,700-line canvas per lane
// would trade one drift problem for a worse one.
//
// That leaves a gap. A trigger added for a later release lives in shared code,
// so without something like this it would appear in PHASE 1's picker the moment
// it was written — and phase 1's entire job is to show what ships.
//
// So: shared code carries every trigger the prototype knows, and a lane declares
// which of them it offers. Adding a trigger for a future release is then one
// entry in TRIGGER_OPTIONS plus one id in the lane that gets it, and no lane
// that wasn't named can be surprised by it.
//
// This is also what keeps the FIXTURES honest. The automation store is one list
// shared by every lane, so a seeded lead-magnet automation would otherwise show
// up in phase 2's list — an automation that lane has no way to make. Visibility
// derives from the trigger rather than from a flag on the record (see
// laneShowsTrigger): a lane shows the automations it could have built, which
// stays true for every trigger added after this one without anyone maintaining
// a second list.
// ---------------------------------------------------------------------------

export interface LaneCapabilities {
  /** The triggers this lane offers, in picker order. */
  triggers: TriggerType[];
  /**
   * The steps this lane offers, beyond the two every lane has.
   *
   * Email and wait aren't listed: they're what an automation IS, in every lane
   * and every release, and a list that had to repeat them five times would
   * invite someone to leave one out by accident. This names the additions.
   */
  extraSteps: ExtraStepKind[];
}

/** Step kinds that aren't in every lane. */
export type ExtraStepKind = 'update_member';

// The two membership triggers: what phase 1 and phase 2 both stand on, and the
// baseline the sandboxes explore. Named rather than repeated, so "the shipping
// set" is one thing with one definition.
const MEMBERSHIP_TRIGGERS: TriggerType[] = ['member_subscribes', 'paid_subscription_starts'];

export const LANE_CAPABILITIES: Record<LaneId, LaneCapabilities> = {
  'phase-1': { triggers: MEMBERSHIP_TRIGGERS, extraSteps: [] },
  'phase-2': { triggers: MEMBERSHIP_TRIGGERS, extraSteps: [] },
  // Roadmap: Next brought the label trigger (lead magnets) and the
  // subscription-changed one (lifecycle); Later brought the segment one. Every
  // card after them that adds a trigger adds it here.
  future: {
    triggers: [
      ...MEMBERSHIP_TRIGGERS,
      'label_added',
      'paid_subscription_changed',
      'segment_entered',
    ],
    // Roadmap: Later, "Automated list hygiene" — the first step that changes a
    // member rather than sending to one.
    extraSteps: ['update_member'],
  },
  // The sandboxes explore the SHAPE of the screen, not the feature set, so they
  // stay on the shipping triggers — a sandbox picking up a future trigger for
  // free would muddy what each one is actually asking about.
  exploration: { triggers: MEMBERSHIP_TRIGGERS, extraSteps: [] },
  'exploration-2': { triggers: MEMBERSHIP_TRIGGERS, extraSteps: [] },
};

export const laneOffersTrigger = (lane: LaneId, type: TriggerType): boolean =>
  LANE_CAPABILITIES[lane].triggers.includes(type);

/**
 * The lane's trigger rows for the pickers — the empty trigger card and the
 * Change-trigger popover.
 *
 * Filtered from the shared list rather than declared per lane, so a lane's
 * options can't fall out of order with each other or drift in their copy.
 *
 * Stripe filtering happens AFTER this, and separately: what a lane offers is a
 * property of the release, what the site can use is a property of the site, and
 * folding them would make a Stripe-less site look like a lane with fewer
 * features. See availableTriggerOptions.
 */
export const laneTriggerOptions = (lane: LaneId, simpleNames = false) =>
  (simpleNames ? SIMPLE_TRIGGER_OPTIONS : TRIGGER_PICKER_OPTIONS).filter((option) =>
    laneOffersTrigger(lane, option.value),
  );

/**
 * Whether a lane's list should show an automation, given its trigger.
 *
 * A lane shows what it could have built: if it doesn't offer the trigger, the
 * automation isn't its business. That's how the seeded lead-magnet automation
 * stays out of phase 2 without phase 2 knowing it exists.
 *
 * A NULL trigger is shown everywhere. That's an automation someone created and
 * hasn't answered yet, and it belongs to whoever is looking at it — hiding a
 * record because it's unfinished is how you lose work you just made.
 */
export const laneOffersStep = (lane: LaneId, step: ExtraStepKind): boolean =>
  LANE_CAPABILITIES[lane].extraSteps.includes(step);

export const laneShowsTrigger = (lane: LaneId, trigger: TriggerConfig | null): boolean =>
  trigger === null || laneOffersTrigger(lane, trigger.type);
