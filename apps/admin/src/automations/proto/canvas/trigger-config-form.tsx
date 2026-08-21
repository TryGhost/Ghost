import React, {useState} from 'react';
import {Button, Label} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {EXIT_CRITERIA, TIER_OPTIONS, TRIGGER_OPTIONS, type ExitCriterionId, type TriggerConfig, type TriggerType, availableCriteria, exitCriterion, reconcileCriteria, triggerLabel} from '@/automations/proto/shared/trigger-config';
import {OptionPicker, type PickerOption} from '@/automations/proto/shared/option-picker';

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

// The trigger list, in the shared icon/title/description shape.
const TRIGGER_PICKER_OPTIONS: PickerOption<TriggerType>[] = TRIGGER_OPTIONS.map(option => ({
    value: option.value,
    icon: option.icon,
    title: option.label,
    description: option.description
}));

interface TriggerConfigFormProps {
    config: TriggerConfig;
    onChange: (next: TriggerConfig) => void;
    // Phase-1 lock (see float/trigger-card-model): the select stays visible but
    // disabled — the card still says what starts the flow — and the disclosed
    // tier fields don't render at all rather than stacking disabled controls.
    locked?: boolean;
}

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({config, onChange, locked = false}) => {
    const isPaid = config.type === 'paid_subscription_starts';
    const criteria = availableCriteria(config);
    const [triggerPickerOpen, setTriggerPickerOpen] = useState(false);

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
                wait card's header names its duration field.

                Reads as a select (h-9, full width, chevron) but opens the shared
                picker, so choosing a trigger and choosing a step are the same
                act in the same shape. A plain select would have shown two labels
                a beat apart in meaning with nothing to tell them apart. */}
            <OptionPicker
                align="start"
                open={!locked && triggerPickerOpen}
                options={TRIGGER_PICKER_OPTIONS}
                value={config.type}
                onOpenChange={setTriggerPickerOpen}
                onSelect={changeType}
            >
                <Button className="h-9 w-full justify-between px-3 font-normal" disabled={locked} type="button" variant="outline">
                    {triggerLabel(config)}
                    <LucideIcon.ChevronDown className="opacity-50" />
                </Button>
            </OptionPicker>

            {/* Only the paid trigger watches tiers at all — and locked, the
                disclosed fields go entirely rather than rendering disabled. */}
            {isPaid && !locked && (
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

            {!locked && <Stack gap="sm">
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
            </Stack>}
        </Stack>
    );
};
