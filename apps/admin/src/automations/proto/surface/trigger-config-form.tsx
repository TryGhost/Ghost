import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {GOAL_OPTIONS, TIER_OPTIONS, TRIGGER_OPTIONS, type TierScope, type TriggerConfig, type TriggerType, availableGoals, goalOption, reconcileGoals} from '@/automations/proto/shared/trigger-config';

// Trigger configuration, rendered inside the trigger node's in-canvas popover.
//
// Progressive disclosure, matching the team's proto: the trigger select and the
// goals are always there; the paid-tier controls only exist once the trigger is
// "Paid subscription starts", and the tier picker only once the scope is
// "Specific tier(s)". Nothing is disabled-but-visible — fields appear when they
// become meaningful.

// One goal chip. Fixed goals (unsubscribing always ends a run) render without a
// remove control rather than as a disabled one.
const GoalChip: React.FC<{id: TriggerConfig['goals'][number]; onRemove?: () => void}> = ({id, onRemove}) => {
    const {label, icon: Icon} = goalOption(id);
    return (
        <Inline align="center" className={cn('rounded-full bg-muted py-1.5 pl-3 text-sm text-muted-foreground', onRemove ? 'pr-1.5' : 'pr-3')} gap="sm">
            <Icon className="size-4 shrink-0" strokeWidth={1.5} />
            <span>{label}</span>
            {onRemove && (
                <Button aria-label={`Remove ${label}`} className="size-5 rounded-full text-muted-foreground" size="icon" type="button" variant="ghost" onClick={onRemove}>
                    <LucideIcon.X className="size-3.5" strokeWidth={2} />
                </Button>
            )}
        </Inline>
    );
};

// Tier toggle. Selected state reuses the same treatment the stop-scope options use
// on the float screen (foreground border + muted fill) so "chosen" reads the same
// way across the proto.
const TierChip: React.FC<{label: string; selected: boolean; onClick: () => void}> = ({label, selected, onClick}) => (
    <button
        aria-pressed={selected}
        className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            selected
                ? 'border-foreground bg-muted font-medium text-foreground'
                : 'border-border-default text-muted-foreground hover:bg-muted/40'
        )}
        type="button"
        onClick={onClick}
    >
        {label}
    </button>
);

interface TriggerConfigFormProps {
    config: TriggerConfig;
    onChange: (next: TriggerConfig) => void;
}

// The trigger's own fields, rendered INSIDE the node card (like the wait and
// email forms) rather than in the popover — the card is where a step's own
// settings live. Controls sit at h-9 to match the other cards' inputs.
export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({config, onChange}) => {
    const isPaid = config.type === 'paid_subscription_starts';

    // Trigger/scope changes rewrite which goals exist, so they go through
    // reconcileGoals rather than setting state directly.
    const changeType = (type: TriggerType) => onChange(reconcileGoals({...config, type}, config));

    // "Any" and the individual tiers are mutually exclusive: Any clears the tiers,
    // and picking a tier clears Any. Rather than model that as two states the user
    // has to reconcile, deselecting the last tier snaps back to Any — so there's
    // always exactly one valid selection and never an empty, meaningless one.
    const selectAny = () => onChange(reconcileGoals({...config, tierScope: 'any', tierIds: []}, config));

    const toggleTier = (tierId: string) => {
        const current = config.tierScope === 'specific' ? config.tierIds : [];
        const tierIds = current.includes(tierId)
            ? current.filter(id => id !== tierId)
            : [...current, tierId];
        const scope: TierScope = tierIds.length === 0 ? 'any' : 'specific';
        onChange(reconcileGoals({...config, tierScope: scope, tierIds}, config));
    };

    return (
        <Stack gap="sm">
            {/* No label — the card header already says "Trigger", the same way the
                wait card's header names its duration field. */}
            <Select value={config.type} onValueChange={value => changeType(value as TriggerType)}>
                <SelectTrigger className="h-9">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {TRIGGER_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Appears only for the paid trigger. Labelled, because the chips alone
                don't say what they're scoping. */}
            {isPaid && (
                <Stack className="mt-1" gap="sm">
                    <Label className="text-muted-foreground">Paid tiers</Label>
                    <Inline className="flex-wrap" gap="sm">
                        <TierChip label="Any" selected={config.tierScope === 'any'} onClick={selectAny} />
                        {TIER_OPTIONS.map(tier => (
                            <TierChip
                                key={tier.id}
                                label={tier.name}
                                selected={config.tierScope === 'specific' && config.tierIds.includes(tier.id)}
                                onClick={() => toggleTier(tier.id)}
                            />
                        ))}
                    </Inline>
                </Stack>
            )}
        </Stack>
    );
};

// Goals stay in the popover — they're a list that grows, and the card shouldn't.
export const GoalsForm: React.FC<TriggerConfigFormProps> = ({config, onChange}) => {
    const removeGoal = (id: TriggerConfig['goals'][number]) => onChange({...config, goals: config.goals.filter(goal => goal !== id)});
    const addGoal = (id: TriggerConfig['goals'][number]) => onChange({
        ...config,
        goals: GOAL_OPTIONS.filter(goal => goal.id === id || config.goals.includes(goal.id)).map(goal => goal.id)
    });

    // Goals that apply to this trigger but have been switched off — the only ones
    // the add menu can offer.
    const addableGoals = availableGoals(config).filter(goal => !config.goals.includes(goal.id));

    return (
        <Stack gap="sm">
            <span className="text-sm text-muted-foreground">
                Reaching a goal stops this automation for that member.
            </span>
                <Inline className="flex-wrap" gap="sm">
                    {config.goals.map(id => (
                        <GoalChip
                            key={id}
                            id={id}
                            onRemove={goalOption(id).fixed ? undefined : () => removeGoal(id)}
                        />
                    ))}
                    {addableGoals.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="rounded-full text-muted-foreground" size="sm" type="button" variant="outline">
                                    <LucideIcon.Plus /> Add goal
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {addableGoals.map((goal) => {
                                    const Icon = goal.icon;
                                    return (
                                        <DropdownMenuItem key={goal.id} onClick={() => addGoal(goal.id)}>
                                            <Icon /> {goal.label}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
            </Inline>
        </Stack>
    );
};
