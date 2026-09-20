import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  inputSurface,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Stack } from '@tryghost/shade/primitives';
import {
  ALL_TIER_IDS,
  PAID_TIERS_FIELD_LABEL,
  TIER_OPTIONS,
  type TriggerConfig,
  availableTriggerOptions,
  hasTiers,
  tierDisplayName,
  SIMPLE_TRIGGER_OPTIONS,
  TRIGGER_PICKER_OPTIONS,
  triggerConfigFor,
  exitSentence,
} from '@/automations/proto/shared/trigger-config';
import { useArchivedTierIds, useStripeConnected } from '@/automations/proto/shared/store';
import { PickerRow } from '@/automations/proto/shared/option-picker';
import { CheckboxList, CheckboxRow } from '@/automations/proto/shared/checkbox-list';
import { useDismissOnPanePress } from './flow-utils';

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
}> = ({ onSelect, simpleNames = false }) => {
  // Without Stripe the paid trigger isn't offered at all — see
  // availableTriggerOptions for the whole design. Read from the store here
  // rather than threaded down as a prop: it's site-level state, and every
  // surface that lists triggers has to agree on it.
  const stripeConnected = useStripeConnected();
  return (
    <div className="-mx-4 -mb-4">
      {availableTriggerOptions(
        simpleNames ? SIMPLE_TRIGGER_OPTIONS : TRIGGER_PICKER_OPTIONS,
        stripeConnected,
      ).map((option) => (
        <PickerRow
          key={option.value}
          option={option}
          selected={false}
          onSelect={(type) => onSelect(triggerConfigFor(type))}
        />
      ))}
    </div>
  );
};

// A radio in a row, CheckboxRow's shape exactly — whole-row label target, the
// same SelectItem metrics — so the two kinds of row in this popover read as one
// list at two depths. The optional second line is the mode's consequence, in
// the same dress as the exit sentence below: muted, smaller, part of the row's
// click target.
const RadioRow: React.FC<{
  value: string;
  label: string;
  description?: string;
}> = ({ value, label, description }) => (
  <label className="flex cursor-pointer items-start gap-2.5 rounded-xs px-2 py-1.5 transition-colors hover:bg-interactive-hover">
    {/* mt-0.5 seats the 16px control on the first line's cap height rather
            than centring it against a row that may carry a second line. */}
    <RadioGroupItem className="mt-0.5" value={value} />
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-control">{label}</span>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
    </span>
  </label>
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
  // Increments when the tiers popover should open itself — the canvas's nudge
  // after the creation sequence settles on a paid trigger with no tiers chosen
  // (see tiersRevealPending there). The canvas owns when; this form owns the
  // popover, so the instruction crosses as a counter rather than shared state.
  revealTiersSignal?: number;
  // The SAVED config's tiers. An archived tier is offered while it's in the
  // current selection OR here — so unticking one stays reversible for exactly
  // as long as the removal is unsaved, the same undo horizon as every other
  // edit on the screen. Without it (older lanes), unticking an archived tier
  // removes its row at once.
  savedTierIds?: string[];
}

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({
  config,
  onChange,
  showExits = true,
  revealTiersSignal,
  savedTierIds = [],
}) => {
  const tierIds = config.tierIds;
  const allMode = config.tierMode === 'all';
  // Selected mode with nothing named — the field's placeholder state, and the
  // one the validators call unanswered (see tiersUnanswered).
  const noTier = !allMode && tierIds.length === 0;
  // Site state, read here like Stripe is in the empty-state picker: which
  // tiers have gone quiet decides what the field and its rows say.
  const archivedTierIds = useArchivedTierIds();
  const selectedTiers = TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id));
  const [tiersOpen, setTiersOpen] = useState(false);
  const showTiers = hasTiers(config);
  // Compared against the mount-time value rather than watched in an effect, so
  // a form that MOUNTS with a signal already counted up (re-picking the paid
  // trigger later, a remount mid-session) doesn't fire a stale nudge — only a
  // signal that moves while the form is on screen opens the popover.
  const [prevRevealSignal, setPrevRevealSignal] = useState(revealTiersSignal);
  if (revealTiersSignal !== prevRevealSignal) {
    setPrevRevealSignal(revealTiersSignal);
    if (showTiers) {
      setTiersOpen(true);
    }
  }
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
      {/* A FIELD THAT OPENS, not a form on the card. The tiers were a labelled
                combobox with the exit sentence loose underneath — the card carrying
                its whole configuration on its face. Now the card shows one line: the
                current answer in input chrome (inputSurface, the same recipe every
                Shade control wears) with a pencil naming the interaction, and the
                press opens a wider popover holding the checkboxes AND the exit
                explanation together. The exits ride with the tiers because they're
                consequences of this exact choice — reading them at the moment of
                choosing is when they're worth reading.

                No "Tiers" label above the field: the value ("Any paid tier") says
                what the field holds, and the card's header already says what kind
                of thing is being configured. A pencil rather than a chevron — this
                opens an editing surface, not an option list dropping out of a
                select. */}
      {showTiers && (
        <div className="flex flex-col gap-2">
          {/* The explanation and the field, fused into label-and-answer: the
                    sentence runs INTO the field ("…upgrades or signs up to:" →
                    "Any paid tier"), so the card says what the trigger does and
                    who it watches as one thought instead of a description and a
                    control circling the same fact. Full foreground, not the
                    caption's muted — it's the field's label now, not commentary —
                    and gap-2, the label-to-field distance every form uses. The
                    colon is what keeps every field state grammatical, including
                    the "Choose tiers" placeholder, which reads as an instruction
                    after it. (The read canvas keeps the full written-out sentence
                    — it has no field for a label to point at; the copy itself
                    lives with the stems in trigger-config.) */}
          <span className="text-control">{PAID_TIERS_FIELD_LABEL}</span>
          <Popover modal={false} open={tiersOpen} onOpenChange={setTiersOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label="Edit tiers"
                // hover:bg-muted on top of the input chrome — an input doesn't
                // hover, but this is a button wearing input clothes, and a field
                // that opens something has to say so before the press.
                className={cn(
                  inputSurface('self'),
                  'group/field flex h-9 w-full items-center justify-between gap-2 px-3 text-base',
                  'transition-colors hover:bg-muted',
                )}
                type="button"
              >
                {/* Named tiers render as per-tier spans so an archived one can
                            dim on its own — "Bronze (archived)" muted beside a
                            full-colour "Gold" says which half of the answer has gone
                            quiet without dimming the whole value. */}
                <span className={cn('truncate', noTier && 'text-muted-foreground')}>
                  {noTier
                    ? 'Choose tiers'
                    : allMode
                      ? 'Any paid tier'
                      : selectedTiers.map((tier, index) => (
                          <React.Fragment key={tier.id}>
                            {index > 0 && ', '}
                            <span
                              className={cn(
                                archivedTierIds.includes(tier.id) && 'text-muted-foreground',
                              )}
                            >
                              {tierDisplayName(tier.name, archivedTierIds.includes(tier.id))}
                            </span>
                          </React.Fragment>
                        ))}
                </span>
                {/* Revealed by hovering or focusing the field, like every
                            field-that-opens (see the email content field): at rest the
                            value is the point, and the pen is the interaction's label.
                            The width stays reserved so nothing shifts. */}
                <LucideIcon.Pen
                  className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none"
                  strokeWidth={2}
                />
              </button>
            </PopoverTrigger>
            {/* Sized to the FIELD, via the width Radix reports for the trigger —
                    the popover reads as the field opened up, not a separate surface
                    that happens to appear nearby (Shade's Combobox sizes its list the
                    same way). "always" so it tracks its card when the canvas pans. */}
            <PopoverContent
              align="start"
              className="w-(--radix-popover-trigger-width) p-0"
              updatePositionStrategy="always"
            >
              {/* Two modes as RADIOS, then the list — GitHub's install screen,
                        which is where the review pointed. The old shape was one
                        checkbox list with "Any paid tier" locking the rows beneath it
                        checked-and-disabled, and it had two faults the radios fix:
                        nothing said the "any" answer follows tiers created LATER
                        (the sub-copy now says exactly that), and a mode pretending
                        to be a list item gave this field the one interaction nobody
                        could predict. A mode choice and an item choice are different
                        kinds of question, and now they look like it. */}
              <div className="p-2">
                <RadioGroup
                  className="flex flex-col gap-0"
                  value={config.tierMode}
                  // Flipping mode clears the list either way: an answer given under
                  // one mode isn't an answer under the other, and Select starts
                  // EMPTY on purpose — GitHub's "select at least one". Pre-checking
                  // everything would recreate the exact ambiguity the split removes
                  // (a full checklist that looks like "all" but won't follow future
                  // tiers).
                  onValueChange={(mode) =>
                    onChange({ ...config, tierMode: mode as 'all' | 'selected', tierIds: [] })
                  }
                >
                  <RadioRow
                    description="Includes all current and future paid tiers you create."
                    label="Any paid tier"
                    value="all"
                  />
                  <RadioRow label="Select paid tiers" value="selected" />
                </RadioGroup>
                {/* Revealed by the second radio, indented under it the way
                            GitHub's repository list sits under its option. ml-6 aligns
                            the boxes with the radio labels above (16px control +
                            10px gap). */}
                {!allMode && (
                  <div className="ml-6">
                    {/* An archived tier is offered only while it's in the CURRENT
                                selection or the SAVED one: marked "(archived)", muted,
                                and yours to untick — and to re-tick, because until the
                                removal is saved the saved config still holds it, and an
                                unsaved edit has to stay reversible in place (the only
                                other road back is leaving the screen and discarding
                                everything). Once the removal is committed the row is
                                gone: picking a tier nobody can join is configuring
                                against nothing (Ghost's other tier pickers offer active
                                tiers only). Under "Any paid tier" nothing marks at all —
                                that's a policy over whatever is joinable, and an
                                archived tier just exits the set. */}
                    <CheckboxList>
                      {TIER_OPTIONS.filter(
                        (tier) =>
                          !archivedTierIds.includes(tier.id) ||
                          tierIds.includes(tier.id) ||
                          savedTierIds.includes(tier.id),
                      ).map((tier) => (
                        <CheckboxRow
                          key={tier.id}
                          checked={tierIds.includes(tier.id)}
                          label={tierDisplayName(tier.name, archivedTierIds.includes(tier.id))}
                          muted={archivedTierIds.includes(tier.id)}
                          onCheckedChange={(checked) =>
                            setTiers(
                              // Kept in ALL_TIER_IDS order however they're ticked, so
                              // the field's summary always lists tiers the way the
                              // site orders them.
                              checked
                                ? ALL_TIER_IDS.filter(
                                    (id) => id === tier.id || tierIds.includes(id),
                                  )
                                : tierIds.filter((id) => id !== tier.id),
                            )
                          }
                        />
                      ))}
                    </CheckboxList>
                  </div>
                )}
              </div>
              {/* The exit sentence, footered under the choice it follows from —
                        same voice and size as the card captions. Ruled off because the
                        rows above are controls and this is a consequence, not another
                        row to press. */}
              {showExits && (
                <div className="border-t border-border-default px-4 py-3">
                  <p className="text-control text-muted-foreground">{exitSentence(config)}</p>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* WHAT ENDS A RUN — stated, never chosen.

                This was a field: two locked rows for unsubscribing and deletion, then up
                to three criteria to tick. Every one of them turned out to follow from a
                decision already made higher up the card — you picked the paid trigger, so
                cancelling exists; you picked tiers, so leaving them exists — and the one
                that didn't (stop when they upgrade to paid) was a product opinion of ours
                rather than anything the configuration implies. A control whose every
                answer is derivable isn't a control, it's a readout with extra steps.

                So it's a sentence. See shared/trigger-config for what it costs to
                drop the one real choice.

                And it lives ONLY inside the tiers popover now (above), footered
                under the choice it follows from. It used to render on the card for
                triggers without tiers, which left the free trigger carrying one
                muted caption as its whole body — a card explaining itself to
                nobody in particular. Gone, the free trigger is header-only (the
                canvas skips the body entirely — see triggerBodyEmpty), and the
                cost is stated plainly: the free trigger's exits are no longer
                written anywhere on screen. If that turns out to matter, they
                belong behind an affordance, not loose on the card. */}
    </Stack>
  );
};
