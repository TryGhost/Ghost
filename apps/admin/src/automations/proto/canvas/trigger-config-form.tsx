import React, { useState } from 'react';
import {
  Button,
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
  CHANGE_FIELD_LABEL,
  CHANGE_OPTIONS,
  LABEL_FIELD_LABEL,
  SEGMENT_FIELD_LABEL,
  PAID_TIERS_FIELD_LABEL,
  TIER_OPTIONS,
  type SubscriptionChange,
  type TriggerConfig,
  type TriggerType,
  availableTriggerOptions,
  hasChange,
  hasLabels,
  hasSegment,
  hasTiers,
  tierDisplayName,
  triggerConfigFor,
  exitSentence,
} from '@/automations/proto/shared/trigger-config';
import type { PickerOption } from '@/automations/proto/shared/option-picker';
import { useArchivedTierIds, useStripeConnected } from '@/automations/proto/shared/store';
import { PickerRow } from '@/automations/proto/shared/option-picker';
import { CheckboxList, CheckboxRow } from '@/automations/proto/shared/checkbox-list';
import { canCreateLabel, createLabel, useLabels } from '@/automations/proto/shared/labels';
import { conditionsSentence, useSegments } from '@/automations/proto/shared/segments';
import { SearchableSelectField } from '@/automations/proto/shared/searchable-select-field';
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
  // The lane's trigger rows, already narrowed by shared/capabilities — which is
  // why this no longer takes a `simpleNames` boolean and builds the list itself.
  // Two lanes' worth of difference (phase 1's shorter names, the future lane's
  // extra trigger) can't be carried by one flag, and the caller is the only one
  // that knows which lane it is.
  options: PickerOption<TriggerType>[];
  // The create-button variant (see CREATION_SLOT): when present, the rows
  // become SELECTIONS — highlighted, applying nothing — and a "Create
  // automation" button beneath them is the commit, handing the chosen config
  // up. Without it a row's click IS the answer, as ever.
  onCreate?: (config: TriggerConfig) => void;
}> = ({ options: laneOptions, onSelect, onCreate }) => {
  // Without Stripe the paid trigger isn't offered at all — see
  // availableTriggerOptions for the whole design. Read from the store here
  // rather than threaded down as a prop: it's site-level state, and every
  // surface that lists triggers has to agree on it.
  const stripeConnected = useStripeConnected();
  const options = availableTriggerOptions(laneOptions, stripeConnected);
  // Create-button mode's held choice. Pre-answered when there's only one
  // option (a Stripe-less site): a one-option question with nothing selected
  // would make Create a two-press act for people with no decision to make —
  // the explicit create moment is the point, not the extra click.
  const [selectedType, setSelectedType] = useState<TriggerType | null>(() =>
    onCreate && options.length === 1 ? options[0].value : null,
  );
  return (
    <div className="-mx-4 -mb-4">
      {options.map((option) => (
        <PickerRow
          key={option.value}
          option={option}
          selected={option.value === selectedType}
          onSelect={(type) => (onCreate ? setSelectedType(type) : onSelect(triggerConfigFor(type)))}
        />
      ))}
      {onCreate && (
        // Ruled off like the tiers popover's exit footer: the rows are the
        // question, this is the commit. Full width and disabled until a
        // trigger is chosen — an automation with nothing to start it isn't
        // half-made, it's unmakeable.
        <div className="border-t border-border-default p-4">
          <Button
            className="w-full"
            disabled={selectedType === null}
            type="button"
            onClick={() => selectedType && onCreate(triggerConfigFor(selectedType))}
          >
            Create automation
          </Button>
        </div>
      )}
    </div>
  );
};

// A radio in a row, CheckboxRow's shape exactly — whole-row label target, the
// same SelectItem metrics — so the two kinds of row in this popover read as one
// list at two depths.
//
// It took an optional second line once, for the "any" mode's consequence. Both
// rows are one line now (see the RadioGroup below), so the prop went with the
// copy rather than sitting here unused waiting for someone to find a use for it.
const RadioRow: React.FC<{
  value: string;
  label: string;
}> = ({ value, label }) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-xs px-2 py-1.5 transition-colors hover:bg-interactive-hover">
    <RadioGroupItem value={value} />
    <span className="min-w-0 truncate text-control">{label}</span>
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
  // Increments when this trigger's field should open itself — the canvas's nudge
  // after the creation sequence settles on a trigger that has a question to ask
  // (see fieldRevealPending there). The canvas owns when; this form owns the
  // popovers, so the instruction crosses as a counter rather than shared state.
  //
  // One signal for both fields because only one of them can be on screen: the
  // trigger decides which question the card asks.
  revealFieldSignal?: number;
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
  revealFieldSignal,
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
  // Label and segment: the same control, one with creation and one without —
  // see shared/searchable-select-field, which owns their search and dropdown.
  const showLabels = hasLabels(config);
  const labels = useLabels();
  const showSegment = hasSegment(config);
  const segments = useSegments();
  const selectedSegment = segments.find((segment) => segment.id === config.segmentId) ?? null;
  // The lifecycle change — a closed set of three, so Shade's compound trigger
  // with no search at all.
  const showChange = hasChange(config);
  const [changeOpen, setChangeOpen] = useState(false);
  // Compared against the mount-time value rather than watched in an effect, so
  // a form that MOUNTS with a signal already counted up (re-picking the paid
  // trigger later, a remount mid-session) doesn't fire a stale nudge — only a
  // signal that moves while the form is on screen opens the popover.
  const [prevRevealSignal, setPrevRevealSignal] = useState(revealFieldSignal);
  if (revealFieldSignal !== prevRevealSignal) {
    setPrevRevealSignal(revealFieldSignal);
    if (showTiers) {
      setTiersOpen(true);
    }
    if (showChange) {
      setChangeOpen(true);
    }
  }
  useDismissOnPanePress(tiersOpen, () => setTiersOpen(false));
  useDismissOnPanePress(changeOpen, () => setChangeOpen(false));

  const setTiers = (next: string[]) => onChange({ ...config, tierIds: next });
  const setLabel = (labelId: string | null) => onChange({ ...config, labelId });
  const setChange = (change: SubscriptionChange | null) => onChange({ ...config, change });
  const setSegment = (segmentId: string | null) => onChange({ ...config, segmentId });

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
                        which is where the review pointed. The shape before it was one
                        checkbox list with "Any paid tier" locking the rows beneath it
                        checked-and-disabled: a mode pretending to be a list item, which
                        gave this field the one interaction nobody could predict. A mode
                        choice and an item choice are different kinds of question, and
                        now they look like it.

                        "Any paid tier" carried a second line for a while — that it
                        follows tiers created later. It's gone as noise: two rows in a
                        small popover don't need a paragraph between them, and the
                        radio pair already draws the only distinction that matters
                        (a policy vs a named list). The fact it stated is real and
                        still true; if it needs saying, it belongs where someone is
                        deciding, not permanently under one of two options. */}
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
                  <RadioRow label="Any paid tier" value="all" />
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
            </PopoverContent>
          </Popover>
          {/* The exits, on the CARD under the field — not footered inside the
                    popover, where they lived until the label trigger arrived and put
                    its own copy here.

                    The popover's version was defensible on its own terms: the exits
                    follow from the tiers, so reading them at the moment of choosing
                    is when they're worth reading. What it couldn't survive was a
                    second trigger with a field, because the label field's dropdown
                    closes the instant you pick — a consequence stapled to the bottom
                    of it would be read by nobody. So one of the two triggers was
                    going to state its exits on the card, and the other inside a
                    surface you have to open. Two placements for one sentence, on
                    the same kind of card, decided by which control the field
                    happened to use.

                    On the card, for both. Whatever the popover gained by fusing
                    the sentence to the choice, it cost more in making the trigger
                    card mean different things depending on which trigger it held. */}
          {showExits && (
            <p className="text-control text-muted-foreground">{exitSentence(config)}</p>
          )}
        </div>
      )}

      {/* LABEL, on the label trigger only — the lead-magnet field.

                ONE label, and therefore a plain field-that-opens like the tiers
                one above rather than the members area's token field. It WAS that
                token field — chips, multi-select — until the product decision
                came back singular, and chips for a value that can only ever be
                one thing promise something the trigger can't do.

                Shade's own Combobox, not a hand-rolled picker: the trigger is
                the control chrome (inputSurface, value-or-placeholder, chevron)
                and MultiSelectCombobox in single-select mode is the searchable
                list. The hand-rolled copy of the members picker that lived here
                is deleted — Shade had this, which is reason enough.

                A chevron where the tiers field has a pencil, and deliberately:
                a chevron says an option list drops out of this, which is what
                happens, where the pencil says this opens an editing surface,
                which is what the tiers popover with its radios and checkboxes
                actually is. Same card, two affordances, because they open two
                different kinds of thing.

                CREATING lives in the footer render prop, which hands us the live
                search text — so a publisher building the automation for a form
                they haven't made yet can type the label's name and have it,
                instead of leaving to go create it and coming back. Offered only
                when the typed name isn't already a label (canCreateLabel, the
                members picker's own rule), and it selects what it creates: typing
                a name into a trigger's audience field means "watch this one".

                Null is simply unanswered — see labelUnanswered, which the same
                validators read as they do the tier version. No all-vs-selected
                mode: "any label" would mean every labelled signup, which on a
                site that labels its forms is very nearly every signup. */}
      {showLabels && (
        <div className="flex flex-col gap-2">
          {/* The sentence that runs into the field — and the one place the
                    card states the trigger's real scope. The header says "Label
                    added to member"; this says when a label counts, which is at
                    signup. */}
          <span className="text-control">{LABEL_FIELD_LABEL}</span>
          <SearchableSelectField
            canCreate={(query) => canCreateLabel(labels, query)}
            options={labels}
            placeholder="Choose a label"
            searchLabel="Search labels"
            selectedId={config.labelId}
            onCreate={(name) => createLabel(name).id}
            onSelect={setLabel}
          />
          {/* The exits, on the card under the field — the same placement the
                    tiers field uses, and see the note there for why both ended up
                    here rather than inside their fields. */}
          {showExits && (
            <p className="text-control text-muted-foreground">{exitSentence(config)}</p>
          )}
        </div>
      )}

      {/* THE SEGMENT, on the segment trigger only.

                The label field exactly, minus the Create row — same control,
                because it's the same question: one thing, chosen by name, from a
                list long enough to want searching. See shared/searchable-select-field
                for why the search sits in the field.

                Its create row is present but DISABLED — see the field below for
                why. A label can be made from its own name; a segment can't, and
                the thing that would make one is the members filtering experience,
                which isn't reachable from here yet. */}
      {showSegment && (
        <div className="flex flex-col gap-2">
          <span className="text-control">{SEGMENT_FIELD_LABEL}</span>
          <SearchableSelectField
            // Disabled, deliberately. Creating a segment means reusing the
            // members filtering experience, and that's blocked on
            // useMemberFilterFields moving out of the members domain — the
            // repo's dependency rules stop automations importing it. A builder
            // was prototyped here and removed: a hand-rolled lookalike reads as
            // a proposal for new UI when the plan is to reuse what exists.
            //
            // The row stays so the demo still says creation belongs HERE, which
            // is the part the team reacted to — not having to leave automations,
            // go build a segment, and find your place again.
            newItem={{ label: 'New segment', disabled: true, onSelect: () => {} }}
            options={segments}
            placeholder="Choose a segment"
            searchLabel="Search segments"
            selectedId={config.segmentId}
            onSelect={setSegment}
          />
          {/* The saved filter behind the chosen segment, so the card says what
                    it actually watches rather than only what it's called. A segment's
                    name is the publisher's own shorthand — "At-risk paid members"
                    means whatever they saved — and the trigger card is exactly where
                    you'd want reminding. Nothing when none is chosen: there's no
                    filter to show, and the field's placeholder is already asking. */}
          {selectedSegment && (
            <p className="text-control text-muted-foreground">
              {conditionsSentence(selectedSegment.conditions)}
            </p>
          )}
          {showExits && (
            <p className="text-control text-muted-foreground">{exitSentence(config)}</p>
          )}
        </div>
      )}

      {/* THE SUBSCRIPTION CHANGE, on the lifecycle trigger only.

                The label field's shape with the search and the Create row taken
                out: three fixed options aren't worth a search box, and nobody
                creates a fourth kind of subscription change. So it's back to
                Shade's compound ComboboxTrigger, which is the same chrome the
                label field draws by hand for the sake of holding an input.

                The options complete the label's sentence rather than naming
                nouns — "Triggered when a member's subscription:" / "Is upgraded"
                — which is why the subject sits in the label and not in each row
                (see CHANGE_FIELD_LABEL). It also lets "Ends" stay one word
                without having to say whose doing it was, which for that change
                is frequently nobody's. */}
      {showChange && (
        <div className="flex flex-col gap-2">
          <span className="text-control">{CHANGE_FIELD_LABEL}</span>
          <SearchableSelectField
            options={CHANGE_OPTIONS.map((option) => ({
              id: option.value,
              name: option.label,
            }))}
            placeholder="Choose a change"
            searchable={false}
            searchLabel="Edit subscription change"
            selectedId={config.change}
            onSelect={(next) => setChange(next as SubscriptionChange | null)}
          />
          {/* The exits, on the card like the other two fields — and the one
                    place the winback's defining behaviour is stated: a run ends
                    when the member starts paying again. */}
          {showExits && (
            <p className="text-control text-muted-foreground">{exitSentence(config)}</p>
          )}
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
