// Trigger + exit criteria model for the proto. Proto-local on purpose: the
// framework's AutomationDetail has no trigger config yet, so this lives beside
// the mock data and is threaded through the canvases as its own prop rather than
// bolted onto the API type.
//
// An exit criterion is something the member does that ends the automation for
// them — which is also what a "goal" is, so the two were the same concept under
// different names. The UI settled on exits, and these identifiers followed.

export type TriggerType = 'member_subscribes' | 'paid_subscription_starts';
export type TierScope = 'any' | 'specific';
export type ExitCriterionId = 'unsubscribes' | 'upgrades_to_paid' | 'cancels_paid' | 'leaves_tiers';

export interface TriggerConfig {
    type: TriggerType;
    tierScope: TierScope;
    tierIds: string[];
    exitCriteria: ExitCriterionId[];
}

// Narrow list for now — the two triggers the team's proto covers. Adding a third
// (custom event, leaves audience…) is one entry here plus its criteria below.
export const TRIGGER_OPTIONS: {value: TriggerType; label: string}[] = [
    {value: 'member_subscribes', label: 'Member subscribes'},
    {value: 'paid_subscription_starts', label: 'Paid subscription starts'}
];

// Proto-only tier fixtures — the mock scenarios carry no tiers. Presented as
// toggle chips alongside an "Any tier" chip, which is tierScope rather than a
// tier. All three are paid: this section only exists for the paid trigger, so a
// "Free" tier here was a contradiction.
export const TIER_OPTIONS: {id: string; name: string}[] = [
    {id: 'bronze', name: 'Bronze'},
    {id: 'premium', name: 'Premium'},
    {id: 'gold', name: 'Gold'}
];

interface ExitCriterion {
    id: ExitCriterionId;
    label: string;
    // Unsubscribing always ends the run, so it can't be switched off — its chip
    // reads as on and simply doesn't respond.
    fixed?: boolean;
    // Which trigger shapes this criterion is even meaningful for.
    appliesTo: (config: Pick<TriggerConfig, 'type' | 'tierScope'>) => boolean;
}

// Labels complete the sentence their section opens with ("Member exits when
// they"), so they're bare verb phrases rather than standalone statements — no
// repeated "Member", no third-person 's'.
export const EXIT_CRITERIA: ExitCriterion[] = [
    {
        id: 'unsubscribes',
        label: 'Unsubscribe',
        fixed: true,
        appliesTo: () => true
    },
    {
        id: 'upgrades_to_paid',
        label: 'Upgrade to paid',
        // Only meaningful while they're free — a paid-trigger run starts paid.
        appliesTo: ({type}) => type === 'member_subscribes'
    },
    {
        id: 'cancels_paid',
        label: 'Cancel subscription',
        appliesTo: ({type}) => type === 'paid_subscription_starts'
    },
    {
        id: 'leaves_tiers',
        label: 'Leave selected tier',
        // Meaningless until specific tiers are the thing being watched.
        appliesTo: ({type, tierScope}) => type === 'paid_subscription_starts' && tierScope === 'specific'
    }
];

export const exitCriterion = (id: ExitCriterionId): ExitCriterion => EXIT_CRITERIA.find(criterion => criterion.id === id) ?? EXIT_CRITERIA[0];

export const availableCriteria = (config: TriggerConfig): ExitCriterion[] => EXIT_CRITERIA.filter(criterion => criterion.appliesTo(config));

// Every applicable criterion is on by default — you opt out of the ones you don't want
// rather than hunting for the ones you do.
const defaultCriteria = (config: Pick<TriggerConfig, 'type' | 'tierScope'>): ExitCriterionId[] => EXIT_CRITERIA.filter(criterion => criterion.appliesTo(config)).map(criterion => criterion.id);

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
    type: 'member_subscribes',
    tierScope: 'any',
    tierIds: [],
    exitCriteria: defaultCriteria({type: 'member_subscribes', tierScope: 'any'})
};

// Changing the trigger shape changes which criteria exist. Drop the ones that no
// longer apply and switch on any that just became available, so the set always
// matches the trigger rather than silently keeping a stale one.
export const reconcileCriteria = (config: TriggerConfig, previous: TriggerConfig): TriggerConfig => {
    const wasAvailable = new Set(availableCriteria(previous).map(criterion => criterion.id));
    const kept = config.exitCriteria.filter(id => exitCriterion(id).appliesTo(config));
    const added = availableCriteria(config).map(criterion => criterion.id).filter(id => !wasAvailable.has(id));
    const exitCriteria = [...new Set([...kept, ...added])];
    // Preserve EXIT_CRITERIA order so chips don't reshuffle as they're toggled.
    return {...config, exitCriteria: EXIT_CRITERIA.filter(criterion => exitCriteria.includes(criterion.id)).map(criterion => criterion.id)};
};

export const triggerLabel = (config: TriggerConfig): string => TRIGGER_OPTIONS.find(option => option.value === config.type)?.label ?? TRIGGER_OPTIONS[0].label;

export const tierNames = (tierIds: string[]): string[] => TIER_OPTIONS.filter(tier => tierIds.includes(tier.id)).map(tier => tier.name);

// The one-line summary shown wherever the trigger isn't editable (the read canvas).
// No empty-tier state to report: the chips snap back to "Any" rather than letting
// you deselect everything, so "specific" always names at least one tier.
export const triggerSummary = (config: TriggerConfig): string => {
    const criteria = `${config.exitCriteria.length} exit ${config.exitCriteria.length === 1 ? 'criterion' : 'criteria'}`;
    if (config.type !== 'paid_subscription_starts') {
        return criteria;
    }
    const tiers = tierNames(config.tierIds);
    return config.tierScope === 'specific' && tiers.length > 0
        ? `${tiers.join(', ')} · ${criteria}`
        : `Any paid tier · ${criteria}`;
};
