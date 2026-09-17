import type { ElementType } from 'react';
import type { PickerOption } from '@/automations/proto/shared/option-picker';
import { LucideIcon } from '@tryghost/shade/utils';

// Trigger, audience and exit criteria for the proto. Proto-local on purpose: the
// framework's AutomationDetail has none of this yet, so it lives beside the mock
// data and is threaded through the canvases as its own prop rather than bolted
// onto the API type.
//
// ---------------------------------------------------------------------------
// WHY EACH TRIGGER OWNS ITS OWN SETTINGS
//
// There used to be an AUDIENCE model here: a membership scope (Any member / Free /
// Paid / Complimentary) plus a tier list, attached to EVERY trigger, on the
// reasoning that the trigger says what happens and the audience says who it applies
// to. It read well and it generalised badly.
//
// What it was generalising over was two triggers, one of which doesn't need it. A
// signup welcome is general — that's the whole of it. And on the paid trigger, three
// of the four scopes were dead: Free is impossible (they've just paid), Paid is a
// synonym for the trigger, and Complimentary never fires it at all, because comping
// assigns a tier without creating a subscription. One live value and three that
// couldn't happen is not an axis.
//
// The real mistake was planning for triggers we haven't designed. Beehiiv doesn't
// even have "paid subscription starts" — theirs is "Upgraded", which covers more
// ground precisely because it commits to less. Ours may well move the same way, and
// an audience model built to fit every future trigger would be the thing holding it
// still. So: no shared model, each trigger carries the settings it actually has, and
// the next one gets designed when we know what it is.
//
//   Member signs up            no settings. Everyone who becomes a member.
//   Paid subscription starts   which tiers. All, or some of them.
//
// The exit criteria read the trigger directly now rather than going through an
// audience, which is one fewer indirection for the same answers.
// ---------------------------------------------------------------------------

// The ids stay put while the labels move. "Member signs up" and "Paid
// subscription starts" are the project doc's working titles and will churn again;
// an id that tracked them would invalidate every stored config for a copy change,
// and mean nothing more than the stable one does. (Same reasoning as the phase
// slot, which kept `future` when its label became "Exploration".)
export type TriggerType = 'member_subscribes' | 'paid_subscription_starts';
/**
 * WHAT ENDS A RUN — and why nobody chooses it.
 *
 * This was a list you picked from: unsubscribing and deletion stated as locked rows,
 * then up to three you could tick. It's now a sentence, because every one of them
 * turned out to be a consequence of something you'd already decided rather than a
 * decision of its own.
 *
 *   unsubscribes             You cannot email someone who left. Never was a choice.
 *   cancels subscription     Only exists because you picked the paid trigger.
 *   leaves the tiers         Only exists because you picked specific tiers.
 *
 * The one that WAS a real choice — "stop when they upgrade to paid" — is gone. It
 * was ours rather than the PM's, and its argument was a product opinion (a nurture
 * sequence pitching an upgrade should stop when they upgrade) rather than anything
 * the configuration implies. Offering exactly one opt-in setting on a trigger that
 * otherwise has none is the same over-planning the audience model was.
 *
 * Which it costs something to drop, and the cost should be on the record: a free
 * member who signs up, starts the welcome, then upgrades mid-flow is now in the
 * welcome AND the paid flow. That's the behaviour until someone asks for the
 * general answer, which is a real "exit when ⟨condition⟩" feature rather than one
 * hardcoded criterion.
 *
 * So the config carries no exits at all. The sentence is derived from the trigger
 * and its tiers, which means it cannot drift from them, cannot be stale after a
 * trigger change, and needs no reconciliation when the tiers move.
 */

export interface TriggerConfig {
  type: TriggerType;
  /**
   * How the paid trigger scopes its tiers. 'all' is a POLICY — every paid tier,
   * including tiers created after this automation was configured — where
   * 'selected' is a list of named ones.
   *
   * This used to be inferred: every tier checked meant "any tier". That storage
   * couldn't tell a snapshot of today's tiers apart from a rule that follows
   * future ones, and the review's note was that the UI couldn't say it either —
   * GitHub's install screen draws exactly this line ("all current and future
   * repositories" vs "only select repositories"), and the field now asks the
   * same way. The mode is the fact; it has to be stored, not derived.
   *
   * Meaningless on `member_subscribes`, which has no settings; held as 'all'
   * there rather than as an optional field, so nothing has to null-check it.
   */
  tierMode: 'all' | 'selected';
  /**
   * The named tiers, when tierMode is 'selected'. Empty means unanswered — the
   * field shows its placeholder and validation blocks publishing. Always empty
   * under 'all', where the policy is the answer and a list would be a second
   * copy of it that could drift.
   */
  tierIds: string[];
}

// Narrow list for now — the two triggers the team's proto covers. Adding a third
// (custom event, leaves audience…) is one entry here plus its criteria below.
//
// Icon and description ride along with the label because the trigger is chosen
// from the same icon/title/description picker the steps are — the two labels are
// close enough ("subscribes" vs "paid subscription") that the description is
// what actually tells them apart.
export const TRIGGER_OPTIONS: {
  value: TriggerType;
  label: string;
  description: string;
  icon: ElementType;
}[] = [
  {
    value: 'member_subscribes',
    label: 'Member signs up',
    // The two labels are close enough that the description is what tells them
    // apart — and the confusion the project doc names is exactly this: you can
    // sign up today and become paid next week, so signing up is a first arrival
    // rather than anything to do with money.
    description: 'The first time someone becomes a member',
    icon: LucideIcon.UserPlus,
  },
  {
    value: 'paid_subscription_starts',
    label: 'Paid subscription starts',
    description: 'Someone starts a paid subscription',
    icon: LucideIcon.CreditCard,
  },
];

// The same list in the shared picker's icon/title/description shape, so the rows
// read identically wherever the choice is offered — the empty trigger card, and
// the "Change trigger" popover on a configured one.
export const TRIGGER_PICKER_OPTIONS: PickerOption<TriggerType>[] = TRIGGER_OPTIONS.map(
  (option) => ({
    value: option.value,
    icon: option.icon,
    title: option.label,
    description: option.description,
  }),
);

// PHASE 1 ONLY — the same two triggers under simpler names, with no second line.
//
// That lane is the one being built, and it isn't trying to model the difference
// between becoming a member and starting to pay: it runs one welcome for free
// signups and one for paid. So the names say who arrives rather than what happened
// to them, and once they do, the descriptions have nothing left to add — "The first
// time someone becomes a member" under "Free member signs up" is the same sentence
// twice.
//
// It's a deliberate NARROWING, not just wording. "Member signs up" covers anyone
// arriving; "Free member signs up" excludes a paid arrival, and the paid trigger
// picks those up. The other lanes keep the general names because they're exploring a
// model where the audience is a separate question — see the block at the top.
//
// Kept beside the real vocabulary rather than in phase-1/, so anyone changing one
// can see the other.
export const SIMPLE_TRIGGER_LABELS: Record<TriggerType, string> = {
  member_subscribes: 'Free member signs up',
  paid_subscription_starts: 'Paid member signs up',
};

export const SIMPLE_TRIGGER_OPTIONS: PickerOption<TriggerType>[] = TRIGGER_OPTIONS.map(
  (option) => ({
    value: option.value,
    icon: option.icon,
    title: SIMPLE_TRIGGER_LABELS[option.value],
  }),
);

// Proto-only tier fixtures — the mock scenarios carry no tiers. All three are
// paid: tiers only exist on the paid trigger, so a "Free" tier here would be a
// contradiction.
export const TIER_OPTIONS: { id: string; name: string }[] = [
  { id: 'bronze', name: 'Bronze' },
  { id: 'premium', name: 'Premium' },
  { id: 'gold', name: 'Gold' },
];

export const ALL_TIER_IDS: string[] = TIER_OPTIONS.map((tier) => tier.id);

export const tierNames = (tierIds: string[]): string[] =>
  TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id)).map((tier) => tier.name);

/**
 * Members who are PAYING, which is now the same question as "is this the paid
 * trigger" — it used to also be true of a paid AUDIENCE on any trigger.
 *
 * Kept as a named predicate rather than inlined: the exits and the Stripe check ask
 * about money, not about which trigger was picked, and when a second paid trigger
 * arrives this is the one line that has to know.
 */
export const isPaidTrigger = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'paid_subscription_starts';

/**
 * Triggers that carry a tier list. The same set as the paid ones today.
 *
 * Separate from isPaidTrigger because they answer different questions and have come
 * apart before: comping assigns a tier without a subscription, so a complimentary
 * audience used to have tiers and no money. That audience is gone, but the
 * distinction is the one that would come back with it.
 */
export const hasTiers = (config: Pick<TriggerConfig, 'type'>): boolean => isPaidTrigger(config);

export const needsStripe = (config: Pick<TriggerConfig, 'type'>): boolean => isPaidTrigger(config);

/**
 * The trigger options a site can actually use — every one of them with Stripe,
 * and only the free ones without it.
 *
 * This is the HIDE half of the Stripe design: a site that can't take payments
 * doesn't see the paid trigger offered anywhere (the picker on a new canvas, the
 * Change-trigger list), and its paid automations leave the list. The earlier
 * treatment showed everything and explained why it couldn't publish, on the
 * argument that you can't evaluate a feature you can't see — the team settled on
 * hiding instead: someone without Stripe can't act on the pitch, so the picker
 * was selling them something the product couldn't deliver yet.
 *
 * What hiding can't answer — an automation built while Stripe WAS connected,
 * then disconnected — keeps the old treatment: the trigger card's warning and
 * the publish gate (see stripeMissing in phase-2's detail).
 *
 * Generic over the option shape so one filter serves both pickers' lists
 * (PickerOption and the simple-names variant).
 */
export const availableTriggerOptions = <T extends { value: TriggerType }>(
  options: T[],
  stripeConnected: boolean,
): T[] => (stripeConnected ? options : options.filter((o) => !needsStripe({ type: o.value })));

/** Specific tiers are being watched, rather than the all-tiers policy. */
// Selected mode with at least one tier named. Note this is TRUE when someone
// selects every current tier by hand — that used to read as "any tier", and it
// deliberately doesn't any more: a hand-picked list of today's tiers is a
// snapshot that won't follow future tiers, which is the whole distinction the
// tierMode split exists to draw. Readers that name the audience should name
// those tiers.
export const hasTierFilter = (
  config: Pick<TriggerConfig, 'type' | 'tierMode' | 'tierIds'>,
): boolean => hasTiers(config) && config.tierMode === 'selected' && config.tierIds.length > 0;

/**
 * The tiers question is open: selected mode with nothing named yet. The one
 * invalid tier state, shared by every validator (the canvas card's warning, the
 * detail screen's publish gate, the list's record-level check) so they can't
 * disagree about what unanswered means. 'all' can never be unanswered — the
 * policy is the answer.
 */
export const tiersUnanswered = (
  config: Pick<TriggerConfig, 'type' | 'tierMode' | 'tierIds'>,
): boolean => hasTiers(config) && config.tierMode === 'selected' && config.tierIds.length === 0;

/**
 * "a", "a or b", "a, b, or c" — with the serial comma, which is how the copy for this
 * sentence was written and which earns its keep here: the last item can itself be a
 * phrase ("leave the selected tier(s)"), and without the comma the list runs into it.
 *
 * It had no comma while this also named tiers ("Bronze, Premium or Gold"). Nothing
 * else calls it now.
 */
const orList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : items.length === 2
      ? `${items[0]} or ${items[1]}`
      : `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;

/**
 * What ends a run, as one sentence. See the block above for why it's a sentence.
 *
 * Two shapes, one per trigger. The parts are ordered by how universal the reason is
 * — anyone can unsubscribe, only a paid member can cancel or leave a tier — so the
 * sentence gets more specific as it goes and the reader can stop as soon as it stops
 * being about them.
 *
 * "exit early" rather than "exit": every run ends eventually, and the thing worth
 * warning about is the ones that end before the flow is finished. "if" rather than
 * "when", for the same reason — these are possibilities, not a schedule.
 *
 * DELETION ISN'T NAMED. It used to be ("unsubscribe or are deleted"), stated
 * alongside unsubscribing because both are things a publisher can't email through.
 * It's out because a publisher deleting a member is a rare, deliberate act whose
 * consequences they're already being warned about at the point they do it — so
 * naming it here spends a clause of a sentence everyone reads on a case almost
 * nobody hits. If it needs saying, the member-delete confirmation is where it lands,
 * not here.
 *
 * Which also lines this up with the run data, where ExitReason folds "member
 * deleted" into `unsubscribed` (see mock/types) — one fewer place the two models
 * disagree.
 *
 * The tiers aren't named — "the selected tier(s)" rather than "Bronze or Gold". The
 * field naming them is directly above this line, and a sentence that restated it
 * would have to be re-read every time the field changed.
 *
 * And the tier clause is there for EVERY paid selection, including "Any paid tier",
 * where it's arguably redundant: watching all the tiers means leaving one of them for
 * another is still inside the selection, so the only way out is cancelling — which
 * the clause before it already named. It stays because the alternative is a sentence
 * that grows and shrinks as you edit the field above it, and a reader who has to work
 * out which version they're looking at. One sentence for the paid trigger, one for
 * signup, both true, neither of them moving.
 */
export const exitSentence = (config: Pick<TriggerConfig, 'type'>): string => {
  const parts = isPaidTrigger(config)
    ? ['unsubscribe', 'cancel their subscription', 'leave the selected tier(s)']
    : ['unsubscribe'];
  return `Members exit early if they ${orList(parts)}.`;
};

/**
 * A fresh config for a trigger type.
 *
 * Used when a trigger is chosen for the first time — a created automation starts
 * with no trigger at all, so there's nothing to merge into and the config is built
 * from the choice. Also what a trigger CHANGE produces: swapping the trigger throws
 * the old settings away rather than trying to carry them across, which is what the
 * confirm dialog on the canvas warns about.
 */
export const triggerConfigFor = (type: TriggerType): TriggerConfig => ({
  type,
  // Starts on the 'all' policy, which is GitHub's default on the screen this
  // field now mirrors — and a reversal of the empty-start this had before the
  // tierMode split ("a question the publisher never opened shouldn't arrive
  // answered"). What changed the calculus: the popover now OPENS itself on a
  // fresh paid trigger (see tiersRevealPending on the edit canvas), so the
  // question is put in front of them with its default answer showing rather
  // than arriving answered in a field nobody looked at. Unanswered still
  // exists — it's choosing 'selected' and naming nothing.
  tierMode: 'all',
  tierIds: [],
});

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = triggerConfigFor('member_subscribes');

/**
 * The trigger's own icon — the one shown beside it in the picker.
 *
 * The card wears what you chose rather than a generic bolt, so the icon that
 * identified the option in the list is the icon that identifies the card
 * afterwards. Nothing else on the canvas is labelled by its category either: an
 * email card shows an envelope, not "a step".
 */
export const triggerIcon = (config: Pick<TriggerConfig, 'type'>): ElementType =>
  TRIGGER_OPTIONS.find((option) => option.value === config.type)?.icon ?? TRIGGER_OPTIONS[0].icon;

// What the trigger watches for, in a sentence — the same line the picker shows
// under its name. A trigger with no settings has this and nothing else, so its card
// says what it does rather than standing empty.
export const triggerDescription = (config: Pick<TriggerConfig, 'type'>): string =>
  TRIGGER_OPTIONS.find((option) => option.value === config.type)?.description ??
  TRIGGER_OPTIONS[0].description;

/**
 * The configured card's own explanation — "Triggered when…", Beehiiv's register.
 *
 * Not the picker description reused: that line exists to tell two similar OPTIONS
 * apart mid-choice, where this one tells a reader arriving at a built flow what
 * sets it off. A chosen card answers a different question than a list of choices.
 *
 * "free member" is deliberate on the signup trigger, and it's the one place the
 * word Free appears in that trigger's copy: its title ("Member signs up") reads
 * as any arrival, and a publisher holding both flows needs this card to say which
 * arrivals it means without opening anything. If the model settles on signup
 * genuinely covering paid arrivals too, this sentence is where that decision
 * shows first — change it knowingly.
 *
 * The paid sentence renders on the READ canvas and nowhere else now: the edit
 * card fused its explanation into the tiers field's label ("Triggered when a
 * member starts a subscription to:" — see TriggerFieldsForm), so a written-out
 * copy above the field would say the same fact twice. Keep the two phrasings
 * in step when either moves.
 */
export const triggerExplanation = (config: Pick<TriggerConfig, 'type'>): string =>
  isPaidTrigger(config)
    ? 'Triggered when a member starts a paid subscription.'
    : 'Triggered when someone signs up as a free member.';

// Takes just the type, so it can label a bare choice as readily as a full config
// — the trigger picker shows a label before there's a config to show it from.
export const triggerLabel = (config: Pick<TriggerConfig, 'type'>, simple = false): string =>
  simple
    ? SIMPLE_TRIGGER_LABELS[config.type]
    : (TRIGGER_OPTIONS.find((option) => option.value === config.type)?.label ??
      TRIGGER_OPTIONS[0].label);

// The trigger's title while reviewing a member's run, where every card narrates
// what THIS member did — "Subscribed", not the configuration-voice "Member
// subscribes" the edit and read canvases use.
export const triggerReviewLabel = (config: TriggerConfig): string =>
  config.type === 'paid_subscription_starts' ? 'Started paid subscription' : 'Signed up';

/**
 * Who this automation applies to, as one phrase — "Any member", "Bronze, Gold".
 * Derived rather than stored so it can't disagree with the field.
 *
 * This used to read an audience that every trigger carried. It now reads the trigger
 * itself, which is why there are only three answers: signup is everyone, and the paid
 * trigger is either any tier or the tiers you named.
 */
export const audienceLabel = (
  config: Pick<TriggerConfig, 'type' | 'tierMode' | 'tierIds'>,
): string => {
  const tiers = tierNames(config.tierIds);
  if (hasTierFilter(config) && tiers.length > 0) {
    return tiers.join(', ');
  }
  return isPaidTrigger(config) ? 'Paid members' : 'Any member';
};

// The one-line summary shown wherever the config isn't editable (the read canvas).
//
// Just who it applies to. It used to append the exits that had been chosen, because
// those were the part that varied between two automations with the same audience.
// Nothing varies now — the exits follow from the trigger and its tiers, both of
// which this line already names — so appending them would restate the same line in
// longer words.
export const triggerSummary = (config: TriggerConfig): string => audienceLabel(config);
