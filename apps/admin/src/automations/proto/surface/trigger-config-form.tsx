import React from 'react';
import {Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';
import {EXIT_CRITERIA, TIER_OPTIONS, TRIGGER_OPTIONS, type ExitCriterionId, type TriggerConfig, type TriggerType, availableCriteria, exitCriterion, reconcileCriteria} from '@/automations/proto/shared/trigger-config';

// The trigger's settings, rendered inside the node card alongside every other
// step's inline form: what starts the automation, which tiers it watches, and
// what ends it — all readable and changeable without opening anything.
//
// Chips rather than menus for the two multi-selects, deliberately. Both sets are
// short and closed, so showing every option costs one line each and removes a
// click plus the guesswork of what's behind a summary label. Shade's ToggleGroup
// isn't the right primitive here — it's a segmented control (single muted track,
// no wrapping), whereas these need to wrap freely on a card.

const ToggleChip: React.FC<{
    label: string;
    selected: boolean;
    fixed?: boolean;
    onClick: () => void;
}> = ({label, selected, fixed = false, onClick}) => (
    <button
        aria-pressed={selected}
        className={cn(
            // rounded-md to match Shade's buttons — these are controls sitting
            // among controls, not badges.
            'rounded-md border px-3 py-1.5 text-sm transition-colors',
            selected
                ? 'border-foreground bg-muted font-medium text-foreground'
                : 'border-border-default text-muted-foreground hover:bg-muted/40',
            // Fixed chips read as on and simply don't respond — deliberately not
            // the faded disabled treatment, which would suggest something is
            // switched off or broken rather than permanent.
            fixed && 'cursor-default'
        )}
        disabled={fixed}
        title={fixed ? 'Always applies' : undefined}
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

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({config, onChange}) => {
    const isPaid = config.type === 'paid_subscription_starts';
    const criteria = availableCriteria(config);

    // Trigger and tier-scope changes rewrite which criteria exist, so they go
    // through reconcileCriteria rather than setting state directly.
    const changeType = (type: TriggerType) => onChange(reconcileCriteria({...config, type}, config));
    const selectAny = () => onChange(reconcileCriteria({...config, tierScope: 'any', tierIds: []}, config));

    // "Any" and the individual tiers stay mutually exclusive: Any clears the tiers,
    // picking a tier clears Any, and clearing the last tier falls back to Any — so
    // there's always exactly one valid answer and never an empty one.
    const toggleTier = (tierId: string) => {
        const current = config.tierScope === 'specific' ? config.tierIds : [];
        const tierIds = current.includes(tierId)
            ? current.filter(id => id !== tierId)
            : [...current, tierId];
        onChange(reconcileCriteria({...config, tierScope: tierIds.length === 0 ? 'any' : 'specific', tierIds}, config));
    };

    const toggleCriterion = (id: ExitCriterionId) => {
        if (exitCriterion(id).fixed) {
            return;
        }
        const next = config.exitCriteria.includes(id)
            ? config.exitCriteria.filter(criterion => criterion !== id)
            : [...config.exitCriteria, id];
        // Keep EXIT_CRITERIA order so chips don't reshuffle as they're toggled.
        onChange({...config, exitCriteria: EXIT_CRITERIA.filter(criterion => next.includes(criterion.id)).map(criterion => criterion.id)});
    };

    return (
        // gap="xl" (24px) between the three blocks, double the usual md — the
        // labelled chip sections need more air from the control above them than a
        // single row of inputs would, or the card reads as one dense block.
        <Stack gap="xl">
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

            {/* Only the paid trigger watches tiers at all. */}
            {isPaid && (
                <Stack gap="sm">
                    {/* Paired with the exit label below: enters/exits, each a stem its
                        own chips finish. */}
                    <Label className="text-muted-foreground">Member enters when they subscribe to</Label>
                    <Inline gap="sm" wrap>
                        <ToggleChip
                            label="Any tier"
                            selected={config.tierScope === 'any'}
                            onClick={selectAny}
                        />
                        {TIER_OPTIONS.map(tier => (
                            <ToggleChip
                                key={tier.id}
                                label={tier.name}
                                selected={config.tierScope === 'specific' && config.tierIds.includes(tier.id)}
                                onClick={() => toggleTier(tier.id)}
                            />
                        ))}
                    </Inline>
                </Stack>
            )}

            <Stack gap="sm">
                {/* The label opens a sentence the chips finish, so each chip can be a
                    bare verb phrase instead of repeating "Member" three times. */}
                <Label className="text-muted-foreground">Member exits when they</Label>
                <Inline gap="sm" wrap>
                    {criteria.map(criterion => (
                        <ToggleChip
                            key={criterion.id}
                            fixed={criterion.fixed}
                            label={criterion.label}
                            selected={config.exitCriteria.includes(criterion.id)}
                            onClick={() => toggleCriterion(criterion.id)}
                        />
                    ))}
                </Inline>
            </Stack>
        </Stack>
    );
};
