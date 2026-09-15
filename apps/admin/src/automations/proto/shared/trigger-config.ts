import type { ElementType } from 'react';
import type { PickerOption } from '@/automations/proto/shared/option-picker';
import { LucideIcon } from '@tryghost/shade/utils';

// Trigger, audience and exit criteria for the proto. Proto-local on purpose: the
// framework's AutomationDetail has none of this yet, so it lives beside the mock
// data and is threaded through the canvases as its own prop rather than bolted
// onto the API type.
//
// ---------------------------------------------------------------------------
// WHY AUDIENCE IS SEPARATE FROM THE TRIGGER
//
// Tiers used to live inside the trigger: "Paid subscription starts" carried its
// own tier chips, and every other trigger had none. Two things were wrong with
// that. A signup trigger couldn't be narrowed to a tier at all, and every trigger
// added later would have to decide for itself whether it has tiers and grow its
// own UI for them.
//
// They're now two questions. The trigger says WHAT HAPPENS; the audience says WHO
// IT APPLIES TO, and every trigger gets it. The test for which side a setting
// falls on: does it describe the event, or the person? A signup's source
// describes the event and would belong in the trigger. A tier describes the
// person and belongs here.
//
// Every automation tool we looked at makes this split (Kit, Beehiiv, Outpost,
// Audienceful). The two built for publishers rather than marketers use named
// fields for it, as below, rather than a generic attribute query builder.
//
// The payoff shows up in the exit criteria: they can now read the audience, so
// "cancel subscription" applies to a paid AUDIENCE and not just a paid trigger,
// and "upgrade to paid" correctly disappears for an audience that's already paid.
// ---------------------------------------------------------------------------

// The ids stay put while the labels move. "Member signs up" and "Paid
// subscription starts" are the project doc's working titles and will churn again;
// an id that tracked them would invalidate every stored config for a copy change,
// and mean nothing more than the stable one does. (Same reasoning as the phase
// slot, which kept `future` when its label became "Exploration".)
export type TriggerType = 'member_subscribes' | 'paid_subscription_starts';
/**
 * The exits a publisher actually CHOOSES.
 *
 * The test is: could a reasonable publisher want the other answer? Three of the
 * four pass it, and only unsubscribing doesn't — you cannot email someone who
 * left, so that one is stated rather than offered (AUTOMATIC_EXIT_SENTENCE).
 *
 * The reasons the other three pass aren't obvious, which is why they're written
 * down:
 *
 *   upgrades_to_paid  A nurture sequence pitching an upgrade should stop when
 *                     they upgrade. A general onboarding shouldn't, or you
 *                     truncate someone's onboarding as a reward for paying you.
 *
 *   cancels_paid      Cancelling in Ghost is usually an INTENT, not a lapse —
 *                     `cancel_at_period_end` on the subscription, and members
 *                     keep access until the period ends. So a publisher can
 *                     reasonably stop on the signal, or keep serving someone
 *                     who is still paid up for another three weeks.
 *
 *   leaves_tiers      A Bronze member who upgrades to Gold has left the watched
 *                     tier without losing anything. Finishing their sequence is
 *                     a defensible answer.
 *
 * Adding the next real choice is one entry here and one in EXIT_CRITERIA.
 */
export type ExitCriterionId = 'upgrades_to_paid' | 'cancels_paid' | 'leaves_tiers';

/**
 * Who an automation applies to.
 *
 * Two axes, and deliberately two fields on the card rather than one. They were
 * briefly a single flat list — Free, Any paid tier, then the tiers — which
 * modelled nicely (an empty list meant everyone, and one superset rule kept it
 * coherent) but read badly: the combobox hoists chosen options to the top, so
 * picking a tier lifted it out of its group and the list rearranged itself under
 * the cursor. Two stable lists beat one that moves.
 *
 * `scope` is the membership axis; `tierIds` narrows a paid audience further and
 * is meaningless otherwise. Empty tierIds under a paid scope means "any paid
 * tier" — the absence of a narrowing rather than a third scope value, so there's
 * no state where the scope says one thing and the tiers say another.
 */
export type AudienceScope = 'all' | 'free' | 'paid' | 'comped';

export interface Audience {
  scope: AudienceScope;
  tierIds: string[];
}

export interface TriggerConfig {
  type: TriggerType;
  audience: Audience;
  exitCriteria: ExitCriterionId[];
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

// The membership axis. "Any member" is a scope rather than a membership type,
// which is why it leads rather than sitting among the others. The rest mirror
// Ghost's own member statuses (free | paid | comped).
//
// Complimentary is here rather than being its own trigger, which was the other
// option the project doc floats. A comped member isn't a different EVENT — they
// still arrive by being given a tier — they're a different kind of member, which
// is what this field is for. It's also what the requests describe: a publisher
// whose comped member received no welcome at all wants them in the flow, not a
// second flow.
//
// ('gift' is Ghost's fourth member status and isn't here — nobody has asked, and
// gifting has its own lifecycle worth understanding before it gets an audience.)
export const AUDIENCE_OPTIONS: { value: AudienceScope; label: string }[] = [
  { value: 'all', label: 'Any member' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'comped', label: 'Complimentary' },
];

// Proto-only tier fixtures — the mock scenarios carry no tiers. All three are
// paid: tiers only exist under a paid audience, so a "Free" tier here would be a
// contradiction.
export const TIER_OPTIONS: { id: string; name: string }[] = [
  { id: 'bronze', name: 'Bronze' },
  { id: 'premium', name: 'Premium' },
  { id: 'gold', name: 'Gold' },
];

export const ANY_AUDIENCE: Audience = { scope: 'all', tierIds: [] };

export const tierNames = (tierIds: string[]): string[] =>
  TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id)).map((tier) => tier.name);

/**
 * Members who are PAYING. Complimentary members deliberately aren't: they hold a
 * tier without a subscription, so there is nothing for them to cancel and nothing
 * about them that needs Stripe.
 */
export const isPaidAudience = (config: Pick<TriggerConfig, 'type' | 'audience'>): boolean =>
  config.type === 'paid_subscription_starts' || config.audience.scope === 'paid';

/**
 * Members who are ON A TIER, paying or not.
 *
 * Comping someone means assigning them a tier (`tiers: [{id, expiry_at}]` on the
 * member), so a complimentary audience narrows by tier exactly as a paid one
 * does — and a comp ending is leaving that tier. This is what the Tiers field and
 * the tier exit hang off; isPaidAudience is the one about money.
 */
export const hasTiers = (config: Pick<TriggerConfig, 'type' | 'audience'>): boolean =>
  isPaidAudience(config) || config.audience.scope === 'comped';

/**
 * Exit criteria that can only happen on a site taking payments. Listed rather
 * than inferred from "all of them" so adding a non-paid criterion later doesn't
 * silently start requiring Stripe.
 */
const STRIPE_CRITERIA: ExitCriterionId[] = ['upgrades_to_paid', 'cancels_paid', 'leaves_tiers'];

/**
 * Does this configuration depend on Stripe?
 *
 * True for a paid trigger or a paid audience, and also for a free automation
 * that exits on an upgrade — the trigger isn't the only thing that can need
 * payments. The screens use it to explain why publishing is unavailable rather
 * than to hide anything: a publisher without Stripe can still build the
 * automation and see what it would be.
 */
export const needsStripe = (config: TriggerConfig): boolean =>
  isPaidAudience(config) || config.exitCriteria.some((id) => STRIPE_CRITERIA.includes(id));

/** Specific tiers are being watched, rather than any tier. */
export const hasTierFilter = (config: Pick<TriggerConfig, 'type' | 'audience'>): boolean =>
  hasTiers(config) && config.audience.tierIds.length > 0;

interface ExitCriterion {
  id: ExitCriterionId;
  // A function of the config, so a criterion can name what it's actually watching
  // ("Leave Bronze or Gold") instead of pointing vaguely at a setting elsewhere.
  label: (config: Pick<TriggerConfig, 'type' | 'audience'>) => string;
  // Which trigger + audience shapes this criterion is even meaningful for.
  appliesTo: (config: Pick<TriggerConfig, 'type' | 'audience'>) => boolean;
}

// Labels complete the sentence their section opens with ("Also exit when they"),
// and the change summary's ("Members now exit when they …"), so they're bare verb
// phrases rather than standalone statements — no repeated subject.
export const EXIT_CRITERIA: ExitCriterion[] = [
  {
    id: 'upgrades_to_paid',
    label: () => 'Upgrade to paid',
    // Only meaningful while they're free — so not for anyone already on a tier,
    // comped included. A comped member converting to a real subscription is a
    // genuine event, but it isn't this one: "upgrade to paid" as worded is the
    // free-to-paid step, and comp-to-paid deserves its own name if anyone wants it.
    appliesTo: (config) => config.type === 'member_subscribes' && !hasTiers(config),
  },
  {
    id: 'cancels_paid',
    label: () => 'Cancel subscription',
    // Only where there's a subscription to cancel. A comped member's access ends
    // when the publisher removes the comp or it expires — that's leaving the tier,
    // not cancelling.
    appliesTo: isPaidAudience,
  },
  {
    id: 'leaves_tiers',
    // Names the tiers rather than saying "selected tiers", so the chip is
    // readable without looking back up at the audience block — and so it changes
    // when the audience does, instead of quietly meaning something new.
    label: (config) => {
      const tiers = tierNames(config.audience.tierIds);
      return tiers.length > 0 ? `Leave ${orList(tiers)}` : 'Leave selected tiers';
    },
    // Meaningless until specific tiers are the thing being watched — under "any
    // paid tier" this would be the same event as cancelling.
    appliesTo: hasTierFilter,
  },
];

// ---------------------------------------------------------------------------
// Automatic exits — derived from the trigger and audience, never chosen.
//
// One rule generates all of them: A MEMBER EXITS WHEN THE AUTOMATION'S OWN ENTRY
// CONDITIONS WOULD NO LONGER MATCH THEM. Cancelling ends a paid audience's claim
// on someone; leaving Bronze ends a Bronze audience's. Unsubscribing is the one
// that isn't about the audience — you cannot email someone who left.
//
// That rule is also why "leave selected tier" was never really a criterion. It's
// the audience's tier clause read backwards, which is why it could only ever
// appear once tiers were chosen, and why under "any paid tier" it was the same
// event as cancelling.
// ---------------------------------------------------------------------------

/** "Bronze", "Bronze or Gold", "Bronze, Premium or Gold". */
const orList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

/**
 * The exits that aren't choices, stated rather than offered.
 *
 * A constant, not a derivation. Cancelling and leaving a tier were in here for a
 * while on the reasoning that a member exits when the automation's entry
 * conditions stop matching them — a tidy rule, and wrong. Both have a defensible
 * other answer (see EXIT_CRITERIA), so both went back to being chips. These two
 * don't: you cannot email someone who unsubscribed, and you cannot email someone
 * who no longer exists.
 *
 * Two OTHER things end a run, and they're deliberately not here:
 *
 *   Turning the automation off  Already said at the moment it matters — the
 *                               confirmation dialog states that members in
 *                               progress will be removed. This card describes how
 *                               the automation is configured, not what happens
 *                               when you act on it.
 *   A delivery failing         A fault, not a rule. Run review names it on the
 *                               card for the member it happened to, which is
 *                               where it's useful; as a standing sentence it
 *                               would only say that we stop emailing people we
 *                               can't email.
 *
 * Worth knowing before anyone reconciles this against the run data: ExitReason
 * folds "member deleted" into `unsubscribed` on purpose (see mock/types), because
 * the team hasn't settled whether the two read differently. This sentence names
 * them separately. If that split gets decided, both places move together.
 */
export const AUTOMATIC_EXIT_SENTENCE = 'Members always exit when they unsubscribe or are deleted.';

export const exitCriterion = (id: ExitCriterionId): ExitCriterion =>
  EXIT_CRITERIA.find((criterion) => criterion.id === id) ?? EXIT_CRITERIA[0];

export const availableCriteria = (config: TriggerConfig): ExitCriterion[] =>
  EXIT_CRITERIA.filter((criterion) => criterion.appliesTo(config));

// Every applicable criterion is on by default — you opt out of the ones you don't want
// rather than hunting for the ones you do.
const defaultCriteria = (config: Pick<TriggerConfig, 'type' | 'audience'>): ExitCriterionId[] =>
  EXIT_CRITERIA.filter((criterion) => criterion.appliesTo(config)).map((criterion) => criterion.id);

/**
 * A fresh config for a trigger type, with every applicable exit criterion on.
 *
 * Used when a trigger is chosen for the first time — a created automation starts
 * with no trigger at all, so there's nothing to merge into and the config is
 * built from the choice.
 */
export const triggerConfigFor = (type: TriggerType): TriggerConfig => ({
  type,
  audience: ANY_AUDIENCE,
  exitCriteria: defaultCriteria({ type, audience: ANY_AUDIENCE }),
});

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = triggerConfigFor('member_subscribes');

// Changing the trigger OR the audience changes which criteria exist. Drop the
// ones that no longer apply and switch on any that just became available, so the
// set always matches the configuration rather than silently keeping a stale one.
export const reconcileCriteria = (
  config: TriggerConfig,
  previous: TriggerConfig,
): TriggerConfig => {
  const wasAvailable = new Set(availableCriteria(previous).map((criterion) => criterion.id));
  const kept = config.exitCriteria.filter((id) => exitCriterion(id).appliesTo(config));
  const added = availableCriteria(config)
    .map((criterion) => criterion.id)
    .filter((id) => !wasAvailable.has(id));
  const exitCriteria = [...new Set([...kept, ...added])];
  // Preserve EXIT_CRITERIA order so chips don't reshuffle as they're toggled.
  return {
    ...config,
    exitCriteria: EXIT_CRITERIA.filter((criterion) => exitCriteria.includes(criterion.id)).map(
      (criterion) => criterion.id,
    ),
  };
};

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

// Takes just the type, so it can label a bare choice as readily as a full config
// — the trigger picker shows a label before there's a config to show it from.
export const triggerLabel = (config: Pick<TriggerConfig, 'type'>): string =>
  TRIGGER_OPTIONS.find((option) => option.value === config.type)?.label ?? TRIGGER_OPTIONS[0].label;

// The trigger's title while reviewing a member's run, where every card narrates
// what THIS member did — "Subscribed", not the configuration-voice "Member
// subscribes" the edit and read canvases use.
export const triggerReviewLabel = (config: TriggerConfig): string =>
  config.type === 'paid_subscription_starts' ? 'Started paid subscription' : 'Signed up';

/**
 * Who this automation applies to, as one phrase — "Any member", "Free members",
 * "Bronze, Gold". Derived rather than stored so it can't disagree with the chips.
 */
export const audienceLabel = (config: Pick<TriggerConfig, 'type' | 'audience'>): string => {
  const tiers = tierNames(config.audience.tierIds);
  if (hasTierFilter(config) && tiers.length > 0) {
    return tiers.join(', ');
  }
  if (isPaidAudience(config)) {
    return 'Paid members';
  }
  if (config.audience.scope === 'comped') {
    return 'Complimentary members';
  }
  return config.audience.scope === 'free' ? 'Free members' : 'Any member';
};

// The one-line summary shown wherever the config isn't editable (the read canvas).
//
// Audience leads, because who an automation applies to is what a reader is most
// often checking. The automatic exits aren't repeated here — they're the same for
// every automation with the same audience, so restating them on a read-only card
// spends a line on something the audience already implies. Only a chosen exit is
// worth naming, because only that one varies.
export const triggerSummary = (config: TriggerConfig): string => {
  const chosen = config.exitCriteria
    .filter((id) => exitCriterion(id).appliesTo(config))
    .map((id) => exitCriterion(id).label(config).toLowerCase());
  return chosen.length > 0
    ? `${audienceLabel(config)} · also exits when they ${orList(chosen)}`
    : audienceLabel(config);
};
