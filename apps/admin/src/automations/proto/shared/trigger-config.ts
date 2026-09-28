import type { ElementType } from 'react';
import type { PickerOption } from '@/automations/proto/shared/option-picker';
import { LucideIcon } from '@tryghost/shade/utils';
import { labelName } from './labels';
import { segmentName } from './segments';

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
export type TriggerType =
  | 'member_subscribes'
  | 'paid_subscription_starts'
  | 'label_added'
  | 'paid_subscription_changed'
  | 'segment_entered';

/**
 * What happened to a paid subscription, on `paid_subscription_changed`.
 *
 * ENDED, not "cancelled". Cancelling is one way out of a tier and not even the
 * commonest — a card that stops working, a subscription that lapses at period
 * end, a comp that expires, a publisher who removes it. A trigger named for the
 * cancel button would miss every member who left by the other roads, which for a
 * winback flow is most of the people it exists to reach.
 *
 * It also changes who the sentence is about. Upgrading and downgrading are
 * things a member DOES; ending is often something that merely happens to them,
 * which is why that option's stem is the one written passively.
 */
export type SubscriptionChange = 'upgraded' | 'downgraded' | 'ended';
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
  /**
   * The label the trigger watches, on `label_added`. ONE label — null until it's
   * chosen, which is the unanswered state (see labelUnanswered).
   *
   * Singular because the product decision is singular, and the type should say
   * so. It was `labelIds: string[]` first, with a multi-select picker; capping
   * that array at one would leave every reader handling a second element that
   * can never arrive, and would be the obvious place for multi-select to creep
   * back in without anyone deciding it should.
   *
   * There's no all-vs-selected mode either, unlike tiers. "Any label" isn't an
   * answer anyone would pick: on a site that labels its signup forms it means
   * very nearly every signup.
   *
   * Null on every other trigger, held rather than optional for the same reason
   * tierMode is: nothing has to check for the field's absence as well as its
   * emptiness.
   */
  labelId: string | null;
  /**
   * Which change the trigger watches, on `paid_subscription_changed`. Null until
   * it's chosen — the unanswered state (see changeUnanswered).
   *
   * Null rather than a default, unlike tierMode's 'all'. That default is a real
   * policy answer someone might have given; none of these three is — an upgrade
   * thank-you and a winback are opposite automations, and arriving pre-set to
   * one of them would put an answer in a field nobody opened.
   */
  change: SubscriptionChange | null;
  /**
   * The segment the trigger watches, on `segment_entered`. Null until chosen —
   * the unanswered state (see segmentUnanswered).
   *
   * One segment, like the label. Segments are themselves arbitrary filters, so
   * "any of these two" is a segment somebody could have saved instead, and
   * offering it here would be a filter builder wearing a multi-select.
   */
  segmentId: string | null;
}

// ONE sentence stem per trigger, and every surface derives its copy from it —
// the picker says "When ⟨stem⟩", the configured card and the read canvas say
// "Triggered when ⟨stem⟩." — so the option someone chose and the card they get
// carry the same words in the same order (design/product feedback: the two
// states had drifted into different sentences for one fact). The picker drops
// "Triggered" because its rows are answers to a question the card is already
// asking; the configured card keeps it because it stands alone.
//
// "someone", not "a member", in both: the free stem is about a person who
// ISN'T a member yet, and one subject across the pair keeps them parallel.
// The stems are deliberately MIRRORED — "signs up as a free member" / "signs
// up as a paid member or upgrades" — so the two options read as one sentence
// with one word swapped, plus the road only paid has. "free"/"paid" is the
// load-bearing pair: the titles alone don't say which arrivals each means.
const TRIGGER_SENTENCE_STEMS: Record<TriggerType, string> = {
  member_subscribes: 'someone signs up as a free member',
  paid_subscription_starts: 'someone signs up as a paid member or upgrades',
  // The label trigger keeps the family's "someone signs up" opening on purpose.
  //
  // Its TITLE is "Label added", which is the event as engineering would name it
  // and as the roadmap doc writes it — but a label can be added by a form, by an
  // admin clicking one, by a CSV import, or by the API, and only the first of
  // those fires this. (The project doc's open question, answered "I think only on
  // signup".) So the title names the event and this sentence says when it
  // actually happens, which is what every description under a trigger is for.
  //
  // It also means the trigger stays a thing the MEMBER did, like the two above
  // it, rather than a thing the site did — which is what keeps the three reading
  // as one family instead of two kinds of trigger sharing a picker.
  label_added: 'someone signs up with the selected label',
  // Generic, for the picker row — the option has to describe the whole trigger
  // before a change has been chosen. Once one is, the card says the specific
  // thing instead (see CHANGE_SENTENCE_STEMS).
  paid_subscription_changed: "a member's subscription is upgraded, downgraded or ends",
  // The first trigger that watches a STATE rather than an event.
  //
  // Everything above it fires on something that happened at a moment you could
  // name: a signup, a subscription changing, a label arriving with a form
  // submission. A segment is a saved filter, so entering one isn't an act at all
  // — it's the consequence of some property crossing a line, and it can happen
  // because the member did something, because time passed, or because the
  // publisher edited the segment.
  //
  // Nothing in the proto depends on that distinction; it's here because it's the
  // thing an engineer will ask about first, and because it's what makes
  // re-entry (roadmap: Post 7.0) a real question for this trigger in a way it
  // isn't for the others — you can leave a segment and come back next week
  // without doing anything.
  segment_entered: 'a member enters the selected segment',
};

/**
 * One stem per change, the specific version of the trigger's generic one. The
 * configured card and the read canvas say THIS, so an automation reads as the
 * thing it actually watches rather than as all three possibilities.
 *
 * "is upgraded" rather than "upgrades" across all three: the ended case can't
 * take an active verb without lying about who did it (see SubscriptionChange),
 * and a set where one member of it reads differently from the others makes the
 * odd one look like a mistake rather than a distinction.
 */
const CHANGE_SENTENCE_STEMS: Record<SubscriptionChange, string> = {
  upgraded: "a member's subscription is upgraded",
  downgraded: "a member's subscription is downgraded",
  ended: "a member's subscription ends",
};

// Narrow list for now — the two triggers the team's proto covers. Adding a third
// (custom event, leaves audience…) is one entry here plus its stem above.
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
    description: `When ${TRIGGER_SENTENCE_STEMS.member_subscribes}`,
    icon: LucideIcon.UserPlus,
  },
  {
    value: 'paid_subscription_starts',
    label: 'Paid subscription starts',
    description: `When ${TRIGGER_SENTENCE_STEMS.paid_subscription_starts}`,
    icon: LucideIcon.CreditCard,
  },
  // Last, under the two membership triggers: those are about what someone became,
  // this is about how they arrived. Offered in the FUTURE lane only — see
  // shared/capabilities.
  {
    value: 'label_added',
    label: 'Label added to member',
    description: `When ${TRIGGER_SENTENCE_STEMS.label_added}`,
    icon: LucideIcon.Tag,
  },
  // Beside the other paid trigger: one is about a subscription starting, this is
  // about what happens to it afterwards.
  {
    value: 'paid_subscription_changed',
    label: 'Paid subscription changed',
    description: `When ${TRIGGER_SENTENCE_STEMS.paid_subscription_changed}`,
    icon: LucideIcon.RefreshCw,
  },
  {
    value: 'segment_entered',
    label: 'Member enters segment',
    description: `When ${TRIGGER_SENTENCE_STEMS.segment_entered}`,
    icon: LucideIcon.Filter,
  },
];

// The three changes, as the field offers them. Sentence-completing labels, so
// the field reads as the tail of CHANGE_FIELD_LABEL rather than as three nouns
// under a heading.
export const CHANGE_OPTIONS: { value: SubscriptionChange; label: string }[] = [
  { value: 'upgraded', label: 'Is upgraded' },
  { value: 'downgraded', label: 'Is downgraded' },
  { value: 'ended', label: 'Ends' },
];

export const changeLabel = (change: SubscriptionChange | null): string | null =>
  CHANGE_OPTIONS.find((option) => option.value === change)?.label ?? null;

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
  // Unreachable — phase 1 doesn't offer this trigger (see shared/capabilities),
  // and SIMPLE_TRIGGER_OPTIONS is built from that lane's list. Present because
  // the record is keyed by TriggerType and a partial one would make every reader
  // handle an undefined that can't occur.
  label_added: 'Label added to member',
  paid_subscription_changed: 'Paid subscription changed',
  segment_entered: 'Member enters segment',
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

// Labels live in shared/labels, not here — unlike tiers they can be CREATED
// from the picker (the members area's behaviour), so they're a small store
// rather than a frozen fixture list. This file imports the naming helper so
// audienceLabel can still say who a label trigger watches.

export const tierNames = (tierIds: string[]): string[] =>
  TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id)).map((tier) => tier.name);

/**
 * A tier's display name, with its archived state worn as a suffix — "Bronze
 * (archived)". One spelling for every surface that names tiers alongside
 * their state (the tiers field, its checkbox rows, the read canvas's tier
 * line), so the marking can't drift into variants.
 *
 * Deliberately NOT applied in change summaries or toasts — there it's noise
 * about the site attached to a message about the automation.
 */
export const tierDisplayName = (name: string, archived: boolean): string =>
  archived ? `${name} (archived)` : name;

/** The selected tiers as display names, for surfaces that render one string
 * (the read canvas's tier line — already muted as a whole, so the suffix is
 * the entire marking). The edit field renders per-tier spans instead, so an
 * archived tier can dim on its own. */
export const tierDisplayNames = (tierIds: string[], archivedTierIds: string[]): string[] =>
  TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id)).map((tier) =>
    tierDisplayName(tier.name, archivedTierIds.includes(tier.id)),
  );

/**
 * Members who are PAYING, which is now the same question as "is this the paid
 * trigger" — it used to also be true of a paid AUDIENCE on any trigger.
 *
 * Kept as a named predicate rather than inlined: the exits and the Stripe check ask
 * about money, not about which trigger was picked, and when a second paid trigger
 * arrives this is the one line that has to know.
 */
export const isPaidTrigger = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'paid_subscription_starts' || config.type === 'paid_subscription_changed';

/**
 * Triggers that carry a tier list. NOT the same set as the paid ones any more.
 *
 * This was `isPaidTrigger` verbatim, kept separate on the argument that the two
 * answer different questions and had come apart before. They have now: the
 * lifecycle trigger is paid — it needs Stripe, and its exits are about money —
 * and it carries no tiers at all. "Upgraded to Gold specifically" is a real
 * thing someone will want one day; it isn't this, and giving the trigger a tier
 * field before anyone has asked would be exactly the over-planning the audience
 * model died of (see the block at the top of this file).
 */
export const hasTiers = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'paid_subscription_starts';

/**
 * Does this trigger ask a question of its own?
 *
 * The canvas needs this twice — once to decide whether the card renders the
 * fields form or just its written-out sentence, and once to decide whether to
 * open that field after the creation sequence. It was the same four-way `||`
 * written out in both places, which is how the segment trigger shipped with a
 * card that rendered no field at all: one of the two lists got the new clause
 * and the other didn't, and nothing could catch it, because the predicate was
 * still imported by the list that HAD been updated.
 *
 * One list. A trigger that grows a field is now one entry here, and the two
 * readers cannot disagree.
 */
export const triggerHasField = (config: Pick<TriggerConfig, 'type'>): boolean =>
  hasTiers(config) || hasLabels(config) || hasChange(config) || hasSegment(config);

/** Triggers that carry a segment. The segment trigger, and only it. */
export const hasSegment = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'segment_entered';

/** The segment question is open — the same shape as the other three. */
export const segmentUnanswered = (config: Pick<TriggerConfig, 'type' | 'segmentId'>): boolean =>
  hasSegment(config) && config.segmentId === null;

/** Triggers that carry a subscription change. The lifecycle trigger, and only it. */
export const hasChange = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'paid_subscription_changed';

/**
 * The change question is open: the trigger watches a change and none is named.
 * The lifecycle counterpart to tiersUnanswered and labelUnanswered, read by the
 * same validators so they can't disagree about what unanswered means.
 */
export const changeUnanswered = (config: Pick<TriggerConfig, 'type' | 'change'>): boolean =>
  hasChange(config) && config.change === null;

/** Triggers that carry a label list. The label trigger, and only it. */
export const hasLabels = (config: Pick<TriggerConfig, 'type'>): boolean =>
  config.type === 'label_added';

/**
 * The label question is open: the trigger watches labels and none is named.
 * The label counterpart to tiersUnanswered, and read by the same validators —
 * the canvas card's warning, the detail screen's publish gate, the list's
 * record-level check.
 *
 * Simpler than the tier version because there's no mode to exempt: with no
 * label named, nothing can ever enter, so there is no valid empty state.
 */
export const labelUnanswered = (config: Pick<TriggerConfig, 'type' | 'labelId'>): boolean =>
  hasLabels(config) && config.labelId === null;

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
export const exitSentence = (config: Pick<TriggerConfig, 'type' | 'change'>): string => {
  // The label trigger takes the signup sentence, not a third one. Losing the
  // label looks like the tier clause's counterpart — but entry here happens at
  // SIGNUP, so the label is how someone arrived rather than a state they hold,
  // and a publisher removing it afterwards isn't the member leaving anything.
  // Whether it should pull them out of a half-delivered sequence is a real
  // question and not this demo's to answer.
  if (hasChange(config)) {
    // Derived from the change, the way the tier clause is derived from the
    // tiers. The ENDED case is the interesting one: a winback's whole purpose is
    // to bring someone back, so someone coming back is the run succeeding at the
    // thing it was for — carrying on to send them "we miss you" afterwards is
    // the one outcome nobody wants.
    //
    // Which is an exit this file's own history argues against: "stop when they
    // upgrade to paid" was cut as a product opinion of ours rather than anything
    // the configuration implied. The difference is that this one IS implied. It
    // isn't an opt-in setting on a trigger with no others; it's what the chosen
    // change means, the same way cancelling only exists as an exit because you
    // picked a paid trigger.
    const parts =
      config.change === 'ended'
        ? ['unsubscribe', 'start paying again']
        : ['unsubscribe', 'stop paying'];
    return `Members exit early if they ${orList(parts)}.`;
  }
  if (hasSegment(config)) {
    // Leaving is the segment's own exit, and the only derived one in the set
    // that can happen without the member doing anything — a filter they fall out
    // of because a date moved, or because the publisher edited the segment. It's
    // still right: an automation for people in a segment shouldn't keep running
    // on people who aren't.
    return 'Members exit early if they unsubscribe or leave the segment.';
  }
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
  // Null, and therefore unanswered, on a fresh label trigger — the opposite of
  // tierMode's 'all' default, and deliberately so. There's no policy answer to
  // arrive pre-selected: WHICH label is the entire question this trigger asks,
  // and nobody but the publisher can answer it. The canvas opens the field on a
  // fresh label trigger for the same reason it opens the tiers popover.
  labelId: null,
  // Unanswered on a fresh lifecycle trigger, same as labelId and for the same
  // reason — the canvas opens the field to ask.
  change: null,
  segmentId: null,
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
 * The same stem the picker showed, with "Triggered" restored: what you chose
 * and what the card now says are one sentence at two moments.
 *
 * The paid sentence renders on the READ canvas and nowhere else: the edit card
 * fused its explanation into the tiers field's label (PAID_TIERS_FIELD_LABEL,
 * below), so a written-out copy above the field would say the same fact twice.
 */
export const triggerExplanation = (config: Pick<TriggerConfig, 'type' | 'change'>): string => {
  // The lifecycle trigger says the change it actually watches rather than the
  // generic all-three sentence its picker row shows. Falls back to the generic
  // one while nothing is chosen — which the read canvas can reach on an
  // automation saved mid-answer.
  if (hasChange(config) && config.change) {
    return `Triggered when ${CHANGE_SENTENCE_STEMS[config.change]}.`;
  }
  return `Triggered when ${TRIGGER_SENTENCE_STEMS[config.type]}.`;
};

/**
 * The paid EDIT card's label, run into the tiers field: "…signs up or upgrades
 * to:" completed by "Any paid tier" or the named tiers. The stem's shape with
 * "as a paid member" handed to the field — its value says "paid tiers", so the
 * sentence doesn't have to, and both verbs take the same "to" ("signs up to
 * Bronze", "upgrades to Bronze"), which the full stem's ordering can't. Lives
 * here beside the stems so a copy change touches one file; keep the tail
 * readable against every field state, the "Choose tiers" placeholder included.
 */
export const PAID_TIERS_FIELD_LABEL = 'Triggered when someone signs up or upgrades to:';

/**
 * The label trigger's field label, built the same way: the stem's shape with its
 * tail handed to the field, so the card reads as one sentence — "Triggered when
 * someone signs up with:" completed by the labels themselves.
 *
 * This is also where the trigger's honest scope gets stated on the card. The
 * header says "Label added"; this says when that counts. One sentence doing both
 * jobs beats a caption explaining the title.
 */
export const LABEL_FIELD_LABEL = 'Triggered when someone signs up with:';

/**
 * The lifecycle field's label, built the same way — the sentence's opening, with
 * its verb handed to the field. "Triggered when a member's subscription:"
 * completed by "Is upgraded" / "Is downgraded" / "Ends".
 *
 * The subject sits in the label rather than the options so all three options can
 * be short, and so the one that isn't about the member's own doing ("Ends")
 * doesn't have to find a subject of its own.
 */
export const CHANGE_FIELD_LABEL = "Triggered when a member's subscription:";

/** The segment field's label — the same sentence-into-field shape as the rest. */
export const SEGMENT_FIELD_LABEL = 'Triggered when a member enters:';

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
export const triggerReviewLabel = (config: TriggerConfig): string => {
  // What THIS member did, in the past tense the run review speaks in.
  if (hasChange(config)) {
    return config.change === 'ended'
      ? 'Subscription ended'
      : config.change === 'downgraded'
        ? 'Downgraded'
        : 'Upgraded';
  }
  if (hasSegment(config)) {
    return 'Entered segment';
  }
  return config.type === 'paid_subscription_starts' ? 'Started paid subscription' : 'Signed up';
};

/**
 * Who this automation applies to, as one phrase — "Any member", "Bronze, Gold".
 * Derived rather than stored so it can't disagree with the field.
 *
 * This used to read an audience that every trigger carried. It now reads the trigger
 * itself, which is why there are only three answers: signup is everyone, and the paid
 * trigger is either any tier or the tiers you named.
 */
export const audienceLabel = (
  config: Pick<TriggerConfig, 'type' | 'tierMode' | 'tierIds' | 'labelId' | 'change' | 'segmentId'>,
): string => {
  if (hasLabels(config)) {
    // The named label, or the class it belongs to while the question is still
    // open — the same shape as the paid trigger's "Paid members" fallback, and
    // for the same reason: a trigger that can't run yet shouldn't claim an
    // audience it doesn't have, and "Any member" would be a straight lie here.
    return labelName(config.labelId) ?? 'Labelled members';
  }
  if (hasSegment(config)) {
    // The segment names its own audience better than any class could — that's
    // what a segment IS. Falls back to the class while the question is open.
    return segmentName(config.segmentId) ?? 'Members in a segment';
  }
  if (hasChange(config)) {
    // "Past members" on the ended change, because by the time the flow reaches
    // them they aren't paying any more — calling a winback's audience "Paid
    // members" would name the people it is specifically not for.
    return config.change === 'ended' ? 'Past members' : 'Paid members';
  }
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
