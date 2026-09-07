import React, { useState } from 'react';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Label,
  MultiSelectCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  AUDIENCE_OPTIONS,
  TIER_OPTIONS,
  EXIT_CRITERIA,
  AUTOMATIC_EXIT_SENTENCE,
  TRIGGER_OPTIONS,
  type AudienceScope,
  type ExitCriterionId,
  type TriggerConfig,
  type TriggerType,
  availableCriteria,
  hasTiers,
  reconcileCriteria,
  tierNames,
  triggerLabel,
  triggerConfigFor,
} from '@/automations/proto/shared/trigger-config';
import { OptionPicker, type PickerOption } from '@/automations/proto/shared/option-picker';

// The trigger's settings, rendered inside the node card alongside every other
// step's inline form: what starts the automation, which tiers it watches, and
// what ends it — all readable and changeable without opening anything.
//
// Chips rather than menus for the two multi-selects, deliberately. Both sets are
// short and closed, so showing every option costs one line each and removes a
// click plus the guesswork of what's behind a summary label. Shade's ToggleGroup
// isn't the right primitive here — it's a segmented control (single muted track,
// no wrapping), whereas these need to wrap freely on a card.

// The trigger list, in the shared icon/title/description shape.
const TRIGGER_PICKER_OPTIONS: PickerOption<TriggerType>[] = TRIGGER_OPTIONS.map((option) => ({
  value: option.value,
  icon: option.icon,
  title: option.label,
  description: option.description,
}));

/**
 * The trigger choice on its own: a control that reads as a select and opens the
 * shared icon/title/description picker, so choosing what starts an automation
 * and choosing what happens next are the same act in the same shape.
 *
 * Extracted from the form below because a brand-new automation needs exactly
 * this and nothing else — there's no config to show until something has been
 * picked, so its card is this control and a line of prompt.
 */
export const TriggerChoiceField: React.FC<{
  value: TriggerType | null;
  onSelect: (type: TriggerType) => void;
  locked?: boolean;
}> = ({ value, onSelect, locked = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <OptionPicker
      align="start"
      open={!locked && open}
      options={TRIGGER_PICKER_OPTIONS}
      value={value ?? undefined}
      onOpenChange={setOpen}
      onSelect={onSelect}
    >
      <Button
        className="h-9 w-full justify-between px-3 font-normal"
        disabled={locked}
        type="button"
        variant="outline"
      >
        {/* Unchosen reads as a placeholder, the same muted treatment a select
                    gives one — the control shouldn't look like it already holds an
                    answer when it doesn't. */}
        <span className={cn(!value && 'text-muted-foreground')}>
          {value ? triggerLabel({ type: value }) : 'Choose a trigger'}
        </span>
        <LucideIcon.ChevronDown className="opacity-50" />
      </Button>
    </OptionPicker>
  );
};

/**
 * The trigger card for an automation that has no trigger yet.
 *
 * Deliberately the only thing on the canvas until it's answered: an automation
 * with nothing to start it has no flow to show, and offering "add a step" first
 * would let someone build a sequence that can never run. One question, then the
 * canvas opens up.
 *
 * The control alone, with no help text above it. A card headed "Trigger" holding
 * one empty select that reads "Choose a trigger", as the only object on an
 * otherwise empty canvas, is not a situation anyone needs a sentence to
 * understand — and a line of prose the reader outgrows on their first automation
 * stays there forever.
 */
export const TriggerEmptyState: React.FC<{ onSelect: (config: TriggerConfig) => void }> = ({
  onSelect,
}) => <TriggerChoiceField value={null} onSelect={(type) => onSelect(triggerConfigFor(type))} />;

interface TriggerConfigFormProps {
  config: TriggerConfig;
  onChange: (next: TriggerConfig) => void;
  // Phase-1 lock (see float/trigger-card-model): the select stays visible but
  // disabled — the card still says what starts the flow — and the disclosed
  // tier fields don't render at all rather than stacking disabled controls.
  locked?: boolean;
}

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({
  config,
  onChange,
  locked = false,
}) => {
  // Filtered through availableCriteria so a criterion that stopped applying (the
  // audience changed to paid, say) neither shows in the summary nor in the list.
  const available = availableCriteria(config);
  const chosenIds = available
    .filter((criterion) => config.exitCriteria.includes(criterion.id))
    .map((criterion) => criterion.id);
  const exitOptions = available.map((criterion) => ({
    value: criterion.id,
    label: criterion.label(config),
  }));
  const tierOptions = TIER_OPTIONS.map((tier) => ({ value: tier.id, label: tier.name }));
  const [tiersOpen, setTiersOpen] = useState(false);
  const [exitsOpen, setExitsOpen] = useState(false);
  // The paid trigger already answers the membership question, so its Select would
  // offer a choice with one valid outcome. The tiers below still narrow it.
  const scopeLocked = config.type === 'paid_subscription_starts';
  const showTiers = hasTiers(config);

  // Trigger and audience changes both rewrite which criteria exist, so they go
  // through reconcileCriteria rather than setting state directly.
  const changeType = (type: TriggerType) =>
    onChange(reconcileCriteria({ ...config, type }, config));

  // Changing the membership scope clears the tiers with it. Tiers only narrow a
  // paid audience, and leaving them set behind a Free scope would keep a filter
  // alive that nothing on screen is showing.
  const changeScope = (scope: AudienceScope) =>
    onChange(reconcileCriteria({ ...config, audience: { scope, tierIds: [] } }, config));

  // Tiers are a plain multi-select against "any paid tier" — an empty list IS
  // "any", so there's no separate Any option to keep in sync with the others and
  // no state where the scope and the tiers disagree.
  const setTiers = (tierIds: string[]) =>
    onChange(reconcileCriteria({ ...config, audience: { ...config.audience, tierIds } }, config));

  const setCriteria = (ids: ExitCriterionId[]) =>
    // Keep EXIT_CRITERIA order so the summary doesn't reshuffle as options are
    // picked — the trigger reads them back joined, and a list that reorders itself
    // as you tick boxes reads as though something else changed.
    onChange({
      ...config,
      exitCriteria: EXIT_CRITERIA.filter((criterion) => ids.includes(criterion.id)).map(
        (criterion) => criterion.id,
      ),
    });

  return (
    // gap="xl" (24px) between the blocks, double the usual md — each is a
    // labelled field with its own meaning, and at md they ran together into one
    // dense stack with no visible grouping.
    <Stack gap="xl">
      {/* No label — the card header already says "Trigger", the same way the
                wait card's header names its duration field.

                Reads as a select (h-9, full width, chevron) but opens the shared
                picker, so choosing a trigger and choosing a step are the same
                act in the same shape. A plain select would have shown two labels
                a beat apart in meaning with nothing to tell them apart. */}
      <TriggerChoiceField locked={locked} value={config.type} onSelect={changeType} />

      {/* AUDIENCE — who this applies to, as its own block rather than a clause
                inside the trigger. See shared/trigger-config for why. Locked, the
                disclosed fields go entirely rather than rendering disabled.

                Fields rather than chips. Three rows of chip-shaped things doing
                three different jobs — one pick-one, one pick-many, one add/remove
                — looked like one control repeated and behaved like three, and the
                card read as a pile rather than a form. Everything is a select now,
                including the trigger above, so the card is one shape end to end
                and each row's label says what it's for. */}
      {/* AUDIENCE — who this applies to, as its own block rather than a clause
                inside the trigger. See shared/trigger-config for why. Locked, the
                disclosed fields go entirely rather than rendering disabled.

                Two fields, not one. They were briefly a single flat list — Free,
                Any paid tier, then the tiers — which modelled well but read badly:
                the combobox hoists chosen options to the top, so picking a tier
                lifted it out of its group and the list rearranged itself under the
                cursor. Two stable lists beat one that moves. */}
      {!locked && !scopeLocked && (
        <Stack gap="sm">
          {/* "Applies to" rather than the old "Member enters when they subscribe
                        to". That stem tied tiers to the act of subscribing, which was true
                        of one trigger; this describes the members themselves, which is what
                        an audience is and what every trigger can have.

                        A plain Select, not a multi-select: membership is one-of-three. */}
          <Label className="text-muted-foreground">Applies to</Label>
          <Select
            value={config.audience.scope}
            onValueChange={(value) => changeScope(value as AudienceScope)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      )}

      {/* Tiers narrow a paid or complimentary audience — comping someone means
                giving them a tier, so both are tier-holders. Nothing selected means any
                tier — an
                empty filter rather than an option of its own, so the scope and the
                tiers can never say different things, and the trigger says so in words
                rather than leaving the field looking unanswered. */}
      {!locked && showTiers && (
        <Stack gap="sm">
          <Label className="text-muted-foreground">Tiers</Label>
          <Combobox open={tiersOpen} onOpenChange={setTiersOpen}>
            <ComboboxTrigger aria-label="Tiers">
              <ComboboxValue placeholder={config.audience.tierIds.length === 0}>
                {config.audience.tierIds.length > 0
                  ? tierNames(config.audience.tierIds).join(', ')
                  : 'Any tier'}
              </ComboboxValue>
            </ComboboxTrigger>
            {/* "always" so the list tracks its card when the canvas pans — the
                            same reason the node menus and the option picker set it. */}
            <ComboboxContent updatePositionStrategy="always">
              {/* searchable={false}: three fixed options, and a search box over
                                three rows is chrome asking to be ignored. */}
              <MultiSelectCombobox
                options={tierOptions}
                searchable={false}
                values={config.audience.tierIds}
                onChange={setTiers}
                onClose={() => setTiersOpen(false)}
              />
            </ComboboxContent>
          </Combobox>
        </Stack>
      )}

      {/* EXITS.

                Unsubscribing sits under the field as a statement, not a control.
                There is nothing to decide — you cannot email someone who left — and
                offering the switch would only imply the default was arbitrary.
                Stated rather than offered: the PRD asks for exits to be EXPLICIT,
                and the opposite of implicit is visible, not editable.

                Everything else is in the field, cancelling and leaving a tier
                included. Both were in that sentence for a while, and both have a
                defensible other answer — which is the line: facts are stated,
                choices are offered. */}
      {!locked && exitOptions.length > 0 && (
        <Stack gap="sm">
          <Label className="text-muted-foreground">Also exit when</Label>
          <Combobox open={exitsOpen} onOpenChange={setExitsOpen}>
            <ComboboxTrigger aria-label="Additional exit conditions">
              <ComboboxValue placeholder={chosenIds.length === 0}>
                {chosenIds.length > 0
                  ? exitOptions
                      .filter((option) => chosenIds.includes(option.value))
                      .map((option) => option.label)
                      .join(', ')
                  : 'Nothing else'}
              </ComboboxValue>
            </ComboboxTrigger>
            <ComboboxContent updatePositionStrategy="always">
              <MultiSelectCombobox
                options={exitOptions}
                searchable={false}
                values={chosenIds}
                onChange={setCriteria}
                onClose={() => setExitsOpen(false)}
              />
            </ComboboxContent>
          </Combobox>
          <p className="text-sm text-muted-foreground">{AUTOMATIC_EXIT_SENTENCE}</p>
        </Stack>
      )}
    </Stack>
  );
};
