import React, { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import {
  AUDIENCE_OPTIONS,
  ALL_TIER_IDS,
  EXIT_CRITERIA,
  TIER_OPTIONS,
  AUTOMATIC_EXIT_SENTENCE,
  type AudienceScope,
  type ExitCriterionId,
  type TriggerConfig,
  hasTiers,
  reconcileCriteria,
  tierNames,
  TRIGGER_PICKER_OPTIONS,
  triggerConfigFor,
} from '@/automations/proto/shared/trigger-config';
import { PickerRow } from '@/automations/proto/shared/option-picker';
import { CheckboxList, CheckboxRow } from '@/automations/proto/shared/checkbox-list';

// The trigger's settings, rendered inside the node card alongside every other
// step's inline form: what starts the automation, which tiers it watches, and
// what ends it — all readable and changeable without opening anything.
//
// Chips rather than menus for the two multi-selects, deliberately. Both sets are
// short and closed, so showing every option costs one line each and removes a
// click plus the guesswork of what's behind a summary label. Shade's ToggleGroup
// isn't the right primitive here — it's a segmented control (single muted track,
// no wrapping), whereas these need to wrap freely on a card.

/**
 * The trigger card for an automation that has no trigger yet.
 *
 * The options themselves, listed on the card — not a select that opens them. A
 * new automation's canvas is one card and nothing else, so the card may as well
 * ask its question directly; a select would be a control whose only purpose is to
 * reveal the thing there is room to show.
 *
 * Deliberately the only thing on the canvas until it's answered: an automation
 * with nothing to start it has no flow to show, and offering "add a step" first
 * would let someone build a sequence that can never run.
 *
 * The same PickerRow the step and trigger popovers use, so the choice reads
 * identically wherever it's made. -mx-4 pulls the rows back out of the node body's
 * own p-6 so each row's icon chip lands on 24px — the column a configured card's
 * header chip sits on — and the hover fill reads as an inset list rather than a
 * stack of blocks jammed against the padding.
 *
 * -mb-4 for the same reason vertically. A row carries its own p-4, so the last one
 * sat its 16px on top of the card's 24px and left 40px of nothing under the final
 * option — a card that looked bottom-heavy next to the same card once it holds
 * fields. Pulling the row's padding back into the card's puts the last option 24px
 * off the edge, which is what every other card does.
 */
export const TriggerEmptyState: React.FC<{ onSelect: (config: TriggerConfig) => void }> = ({
  onSelect,
}) => (
  <div className="-mx-4 -mb-4">
    {TRIGGER_PICKER_OPTIONS.map((option) => (
      <PickerRow
        key={option.value}
        option={option}
        selected={false}
        onSelect={(type) => onSelect(triggerConfigFor(type))}
      />
    ))}
  </div>
);

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
  // Every criterion, not just the ones that apply to this configuration.
  //
  // availableCriteria still decides what COUNTS — the summary and the read canvas
  // go through it — but the field shows the whole set while we work out what the
  // list should be. Hiding rows made the field's contents change as the audience
  // changed above it, which is hard to reason about when the question is still
  // "which of these do we even want".
  const chosenIds = EXIT_CRITERIA.filter((criterion) =>
    config.exitCriteria.includes(criterion.id),
  ).map((criterion) => criterion.id);
  const tierIds = config.audience.tierIds;
  // Every tier is "any tier"; none is the error state.
  const anyTier = tierIds.length === ALL_TIER_IDS.length;
  const noTier = tierIds.length === 0;
  const [tiersOpen, setTiersOpen] = useState(false);
  const [exitsOpen, setExitsOpen] = useState(false);
  // The paid trigger already answers the membership question, so its Select would
  // offer a choice with one valid outcome. The tiers below still narrow it.
  const scopeLocked = config.type === 'paid_subscription_starts';
  const showTiers = hasTiers(config);

  // Changing the membership scope clears the tiers with it. Tiers only narrow a
  // paid audience, and leaving them set behind a Free scope would keep a filter
  // alive that nothing on screen is showing.
  const changeScope = (scope: AudienceScope) => {
    // A scope with tiers arrives with all of them; one without has none to hold.
    // Either way the tiers are replaced rather than carried over — leaving them set
    // behind a Free scope would keep a filter alive that nothing on screen shows.
    const next = { ...config, audience: { scope, tierIds: [] } };
    const audience = hasTiers(next) ? { scope, tierIds: [...ALL_TIER_IDS] } : next.audience;
    onChange(reconcileCriteria({ ...config, audience }, config));
  };

  const setTiers = (next: string[]) =>
    onChange(
      reconcileCriteria({ ...config, audience: { ...config.audience, tierIds: next } }, config),
    );

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
      {/* No trigger control here: the card's header carries the trigger's name
                once one is chosen, so a select repeating it would be the same fact
                twice on one card. Changing a trigger after the fact is its own
                question and hasn't been designed yet — a locked card says so with
                the lock in its header, and an unlocked one currently just can't.

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

      {/* Tiers narrow a paid or complimentary audience — comping someone means giving
                someone a tier, so both are tier-holders.
                
                "Any tier" is a row in the list rather than the absence of one. It was the
                absence for a while, which read as an unanswered field: the trigger showed
                greyed placeholder text for what was actually a deliberate, valid answer.
                As a row it checks every tier below it and shows checked only while they
                all are, so there is one thing to look at and it agrees with itself. */}
      {!locked && showTiers && (
        <Stack gap="sm">
          <Label className="text-muted-foreground">Tiers</Label>
          <Combobox open={tiersOpen} onOpenChange={setTiersOpen}>
            <ComboboxTrigger aria-label="Tiers">
              <ComboboxValue placeholder={noTier}>
                {noTier
                  ? 'No tiers selected'
                  : anyTier
                    ? 'Any tier'
                    : tierNames(tierIds).join(', ')}
              </ComboboxValue>
            </ComboboxTrigger>
            {/* "always" so the list tracks its card when the canvas pans — the
                            same reason the node menus and the option picker set it. */}
            <ComboboxContent className="p-2" updatePositionStrategy="always">
              <CheckboxList>
                <CheckboxRow
                  checked={anyTier}
                  label="Any tier"
                  onCheckedChange={(checked) => setTiers(checked ? [...ALL_TIER_IDS] : [])}
                />
                {TIER_OPTIONS.map((tier) => (
                  <CheckboxRow
                    key={tier.id}
                    checked={tierIds.includes(tier.id)}
                    label={tier.name}
                    onCheckedChange={(checked) =>
                      setTiers(
                        checked
                          ? ALL_TIER_IDS.filter((id) => id === tier.id || tierIds.includes(id))
                          : tierIds.filter((id) => id !== tier.id),
                      )
                    }
                  />
                ))}
              </CheckboxList>
            </ComboboxContent>
          </Combobox>
          {/* An automation for no tiers at all would never run. Stated rather than
                        prevented: a checkbox you can't untick is a checkbox that lies about
                        being a checkbox, and the way out is obvious once it's said. */}
          {noTier && <p className="text-sm text-red">Select at least one tier</p>}
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
      {!locked && (
        <Stack gap="sm">
          <Label className="text-muted-foreground">Exit conditions</Label>
          <Combobox open={exitsOpen} onOpenChange={setExitsOpen}>
            <ComboboxTrigger aria-label="Exit conditions">
              <ComboboxValue placeholder={chosenIds.length === 0}>
                {chosenIds.length > 0
                  ? EXIT_CRITERIA.filter((criterion) => chosenIds.includes(criterion.id))
                      .map((criterion) => criterion.label(config))
                      .join(', ')
                  : 'Nothing else'}
              </ComboboxValue>
            </ComboboxTrigger>
            <ComboboxContent className="p-2" updatePositionStrategy="always">
              <CheckboxList>
                {EXIT_CRITERIA.map((criterion) => (
                  <CheckboxRow
                    key={criterion.id}
                    checked={chosenIds.includes(criterion.id)}
                    label={criterion.label(config)}
                    onCheckedChange={(checked) =>
                      setCriteria(
                        checked
                          ? EXIT_CRITERIA.map((entry) => entry.id).filter(
                              (id) => id === criterion.id || chosenIds.includes(id),
                            )
                          : chosenIds.filter((id) => id !== criterion.id),
                      )
                    }
                  />
                ))}
              </CheckboxList>
            </ComboboxContent>
          </Combobox>
          <p className="text-sm text-muted-foreground">{AUTOMATIC_EXIT_SENTENCE}</p>
        </Stack>
      )}
    </Stack>
  );
};
