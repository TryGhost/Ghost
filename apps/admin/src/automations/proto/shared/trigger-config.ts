import type {ElementType} from 'react';
import {LucideIcon} from '@tryghost/shade/utils';

// Trigger + goals model for the proto. Proto-local on purpose: the framework's
// AutomationDetail has no trigger config yet, so this lives beside the mock data
// and is threaded through the canvases as its own prop rather than bolted onto
// the API type.
//
// "Goals" and "exit criteria" are the same concept right now — a goal is a thing
// you want the member to do, and reaching it stops the automation for them. The
// UI says Goals; the description under it explains the stop behaviour.

export type TriggerType = 'member_subscribes' | 'paid_subscription_starts';
export type TierScope = 'any' | 'specific';
export type GoalId = 'unsubscribes' | 'upgrades_to_paid' | 'cancels_paid' | 'leaves_tiers';

export interface TriggerConfig {
    type: TriggerType;
    tierScope: TierScope;
    tierIds: string[];
    goals: GoalId[];
}

// Narrow list for now — the two triggers the team's proto covers. Adding a third
// (custom event, leaves audience…) is one entry here plus its goals below.
export const TRIGGER_OPTIONS: {value: TriggerType; label: string}[] = [
    {value: 'member_subscribes', label: 'Member subscribes'},
    {value: 'paid_subscription_starts', label: 'Paid subscription starts'}
];

// Proto-only tier fixtures — the mock scenarios carry no tiers. Presented as
// toggle chips alongside an "Any" chip, which is tierScope rather than a tier.
export const TIER_OPTIONS: {id: string; name: string}[] = [
    {id: 'free', name: 'Free'},
    {id: 'premium', name: 'Premium'},
    {id: 'gold', name: 'Gold'}
];

interface GoalOption {
    id: GoalId;
    label: string;
    icon: ElementType;
    // Unsubscribing always ends the run, so it can't be removed — it renders as a
    // chip without an ✕ (matching the team's proto).
    fixed?: boolean;
    // Which trigger shapes this goal is even meaningful for.
    appliesTo: (config: Pick<TriggerConfig, 'type' | 'tierScope'>) => boolean;
}

export const GOAL_OPTIONS: GoalOption[] = [
    {
        id: 'unsubscribes',
        label: 'Member unsubscribes',
        icon: LucideIcon.LogOut,
        fixed: true,
        appliesTo: () => true
    },
    {
        id: 'upgrades_to_paid',
        label: 'Upgrades to paid',
        icon: LucideIcon.ChevronsUp,
        // Only a goal while they're free — a paid-trigger run starts already paid.
        appliesTo: ({type}) => type === 'member_subscribes'
    },
    {
        id: 'cancels_paid',
        label: 'Cancels paid subscription',
        icon: LucideIcon.CircleSlash,
        appliesTo: ({type}) => type === 'paid_subscription_starts'
    },
    {
        id: 'leaves_tiers',
        label: 'Member leaves selected tiers',
        icon: LucideIcon.CircleMinus,
        // Meaningless until specific tiers are the thing being watched.
        appliesTo: ({type, tierScope}) => type === 'paid_subscription_starts' && tierScope === 'specific'
    }
];

export const goalOption = (id: GoalId): GoalOption => GOAL_OPTIONS.find(goal => goal.id === id) ?? GOAL_OPTIONS[0];

export const availableGoals = (config: TriggerConfig): GoalOption[] => GOAL_OPTIONS.filter(goal => goal.appliesTo(config));

// Every applicable goal is on by default — you opt out of the ones you don't want
// rather than hunting for the ones you do.
const defaultGoals = (config: Pick<TriggerConfig, 'type' | 'tierScope'>): GoalId[] => GOAL_OPTIONS.filter(goal => goal.appliesTo(config)).map(goal => goal.id);

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
    type: 'member_subscribes',
    tierScope: 'any',
    tierIds: [],
    goals: defaultGoals({type: 'member_subscribes', tierScope: 'any'})
};

// Changing the trigger shape changes which goals exist. Drop the ones that no
// longer apply and switch on any that just became available, so the set always
// matches the trigger rather than silently keeping a stale goal.
export const reconcileGoals = (config: TriggerConfig, previous: TriggerConfig): TriggerConfig => {
    const wasAvailable = new Set(availableGoals(previous).map(goal => goal.id));
    const kept = config.goals.filter(id => goalOption(id).appliesTo(config));
    const added = availableGoals(config).map(goal => goal.id).filter(id => !wasAvailable.has(id));
    const goals = [...new Set([...kept, ...added])];
    // Preserve GOAL_OPTIONS order so chips don't reshuffle as they're toggled.
    return {...config, goals: GOAL_OPTIONS.filter(goal => goals.includes(goal.id)).map(goal => goal.id)};
};

export const triggerLabel = (config: TriggerConfig): string => TRIGGER_OPTIONS.find(option => option.value === config.type)?.label ?? TRIGGER_OPTIONS[0].label;

export const tierNames = (tierIds: string[]): string[] => TIER_OPTIONS.filter(tier => tierIds.includes(tier.id)).map(tier => tier.name);

// The one-line summary shown wherever the trigger isn't editable (the read canvas).
// No empty-tier state to report: the chips snap back to "Any" rather than letting
// you deselect everything, so "specific" always names at least one tier.
export const triggerSummary = (config: TriggerConfig): string => {
    const goals = `${config.goals.length} goal${config.goals.length === 1 ? '' : 's'}`;
    if (config.type !== 'paid_subscription_starts') {
        return goals;
    }
    const tiers = tierNames(config.tierIds);
    return config.tierScope === 'specific' && tiers.length > 0
        ? `${tiers.join(', ')} · ${goals}`
        : `Any paid tier · ${goals}`;
};
