import React, { useEffect, useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Label,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import {
  ALL_TIER_IDS,
  TIER_OPTIONS,
  type TriggerConfig,
  hasTiers,
  tierNames,
  SIMPLE_TRIGGER_OPTIONS,
  TRIGGER_PICKER_OPTIONS,
  triggerConfigFor,
  exitSentence,
} from '@/automations/proto/shared/trigger-config';
import { PickerRow } from '@/automations/proto/shared/option-picker';
import { CheckboxList, CheckboxRow } from '@/automations/proto/shared/checkbox-list';

// Closes a popover opened from inside a node when the canvas BACKGROUND is pressed.
//
// Radix dismisses on a document-level `pointerdown` in the bubble phase, and on the
// React Flow pane that press doesn't arrive: the pane is wired to d3-zoom, whose
// handlers call d3's `nopropagation` (stopImmediatePropagation) so a drag can start
// without the rest of the page reacting. The result is a dropdown you can only close
// by pressing the field that opened it, which is the one thing nobody tries.
//
// Capture runs top-down from the document, ahead of anything on the pane, so it's the
// one phase that still hears the press.
//
// Deliberately scoped to `.react-flow__pane` — the background itself, not "outside".
// Radix already handles every other target correctly, and a broader listener would
// race its trigger: our handler would close on pointerdown and the trigger's own
// click would reopen it, so pressing the field would stop working.
const useDismissOnPanePress = (open: boolean, onDismiss: () => void) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('.react-flow__pane')) {
        onDismiss();
      }
    };
    document.addEventListener('pointerdown', handle, true);
    return () => document.removeEventListener('pointerdown', handle, true);
  }, [open, onDismiss]);
};

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
export const TriggerEmptyState: React.FC<{
  onSelect: (config: TriggerConfig) => void;
  // Phase 1's shorter names, with no second line — see SIMPLE_TRIGGER_OPTIONS.
  simpleNames?: boolean;
}> = ({ onSelect, simpleNames = false }) => (
  <div className="-mx-4 -mb-4">
    {(simpleNames ? SIMPLE_TRIGGER_OPTIONS : TRIGGER_PICKER_OPTIONS).map((option) => (
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
  // Off in phase 1 (simple triggers): the exit sentence belongs to the
  // general-model lanes, where exits are part of what's being explored. A
  // `locked` prop lived here too — phase 1's saved trigger, fields hidden —
  // and went when locked cards stopped rendering this form at all (the canvas
  // draws them header-only; see triggerBodyEmpty there).
  showExits?: boolean;
}

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({
  config,
  onChange,
  showExits = true,
}) => {
  const tierIds = config.tierIds;
  // Every tier is "any tier"; none is the error state.
  const anyTier = tierIds.length === ALL_TIER_IDS.length;
  const noTier = tierIds.length === 0;
  const [tiersOpen, setTiersOpen] = useState(false);
  const showTiers = hasTiers(config);
  useDismissOnPanePress(tiersOpen, () => setTiersOpen(false));

  const setTiers = (next: string[]) => onChange({ ...config, tierIds: next });

  return (
    // gap="xl" (24px) between the blocks, double the usual md — each is a
    // labelled field with its own meaning, and at md they ran together into one
    // dense stack with no visible grouping.
    <Stack gap="xl">
      {/* No trigger control here: the card's header carries the trigger's name
                once one is chosen, so a select repeating it would be the same fact
                twice on one card. Changing a trigger goes through the header's ⋯;
                a locked card (phase 1) simply doesn't offer one — the lock icon
                that used to mark this is retired, since with no fields on the card
                there's no invitation to edit for it to answer.

      {/* No audience block. There was one — a membership scope on every trigger,
                with tiers under it — and it's gone with the model behind it (see
                shared/trigger-config). Signup takes no settings at all now, so on that
                trigger this card is the trigger's name and the exits, full stop.

                Fields rather than chips, for what's left. Rows of chip-shaped things
                doing different jobs — one pick-one, one pick-many, one add/remove —
                looked like one control repeated and behaved like three, and the card
                read as a pile rather than a form. Everything is a select, so the card is
                one shape end to end and each row's label says what it's for. */}

      {/* Tiers, on the paid trigger only — the one setting any trigger still has.
                
                "Any paid tier" is a row in the list rather than the absence of one. It
                was the absence for a while, which read as an unanswered field: the trigger
                showed greyed placeholder text for what was actually a deliberate, valid
                answer.

                It also LOCKS the rows below it. They're ticked, because "any" does include
                every one of them, and disabled, because unticking one from there was the
                one interaction in this field nobody could predict: it silently turned an
                "any tier" automation into a two-tier one, and the row you pressed was the
                only one that ended up off. Making them inert says the choice above owns
                them — untick it first, then pick. One fewer way to end up somewhere you
                didn't ask for.

                Unticking "Any paid tier" empties the list rather than selecting nothing
                in particular: an empty field reads as unanswered, which is exactly what
                you are at that moment.
                
                Unticking everything is still reachable and still means an automation that
                could never run. It carries no message here: validation is being solved as
                its own thing rather than per-field, so this reads as unanswered — see
                `Select` in the trigger — and the objection is raised somewhere that can
                speak for the whole card. */}
      {showTiers && (
        <Stack gap="sm">
          <Label className="text-muted-foreground">Tiers</Label>
          <Combobox open={tiersOpen} onOpenChange={setTiersOpen}>
            <ComboboxTrigger aria-label="Tiers">
              <ComboboxValue placeholder={noTier}>
                {noTier ? 'Select' : anyTier ? 'Any paid tier' : tierNames(tierIds).join(', ')}
              </ComboboxValue>
            </ComboboxTrigger>
            {/* "always" so the list tracks its card when the canvas pans — the
                            same reason the node menus and the option picker set it. */}
            <ComboboxContent className="p-1" updatePositionStrategy="always">
              <CheckboxList>
                <CheckboxRow
                  checked={anyTier}
                  label="Any paid tier"
                  onCheckedChange={(checked) => setTiers(checked ? [...ALL_TIER_IDS] : [])}
                />
                {TIER_OPTIONS.map((tier) => (
                  <CheckboxRow
                    key={tier.id}
                    checked={tierIds.includes(tier.id)}
                    disabled={anyTier}
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
        </Stack>
      )}

      {/* WHAT ENDS A RUN — stated, never chosen.

                This was a field: two locked rows for unsubscribing and deletion, then up
                to three criteria to tick. Every one of them turned out to follow from a
                decision already made higher up the card — you picked the paid trigger, so
                cancelling exists; you picked tiers, so leaving them exists — and the one
                that didn't (stop when they upgrade to paid) was a product opinion of ours
                rather than anything the configuration implies. A control whose every
                answer is derivable isn't a control, it's a readout with extra steps.

                So it's a sentence, and it moves on its own as the tiers above it change.
                Muted and unlabelled: a Label would file it with the fields and invite a
                press. See shared/trigger-config for what it costs to drop the one real
                choice. Not in phase 1 — see showExits. */}
      {showExits && <p className="text-sm text-muted-foreground">{exitSentence(config)}</p>}
    </Stack>
  );
};
