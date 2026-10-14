import React, { useId, useState } from 'react';
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Stack } from '@tryghost/shade/primitives';
import {
  ALL_TIER_IDS,
  ANY_PAID_TIER_ID,
  CHANGE_FIELD_LABEL,
  CHANGE_OPTIONS,
  CHANGE_TIERS_FIELD_LABEL,
  FREE_TIER_ID,
  TRANSITION_FIELD_LABEL,
  LABEL_FIELD_LABEL,
  SEGMENT_FIELD_LABEL,
  PAID_TIERS_FIELD_LABEL,
  SIMPLE_PAID_TIERS_FIELD_LABEL,
  UPGRADED_TIERS_FIELD_LABEL,
  TIER_OPTIONS,
  type SubscriptionChange,
  type TriggerConfig,
  type TriggerType,
  availableTriggerOptions,
  hasLabels,
  hasSegment,
  hasTiers,
  subscriptionChange,
  tierTransition,
  tierDisplayName,
  triggerConfigFor,
  exitSentence,
} from '@/automations/proto/shared/trigger-config';
import type { PickerOption } from '@/automations/proto/shared/option-picker';
import {
  useArchivedTierIds,
  useMultipleTiers,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import { PickerRow } from '@/automations/proto/shared/option-picker';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import { canCreateLabel, createLabel, useLabels } from '@/automations/proto/shared/labels';
import { conditionsSentence, useSegments } from '@/automations/proto/shared/segments';
import { SearchableSelectField } from '@/automations/proto/shared/searchable-select-field';

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
  // And without a second tier, no upgraded trigger — the same hide.
  const multipleTiers = useMultipleTiers();
  const options = availableTriggerOptions(laneOptions, stripeConnected, multipleTiers);
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

// The tier question's two modes, as the mode Select offers them. 'all' is a
// policy (it follows tiers created later); 'selected' is a named list — see
// TriggerConfig.tierMode. One question, worded for what the trigger watches:
// starting on a tier, or moving up to one.
type TierModeOption = { value: TriggerConfig['tierMode']; label: string };
const STARTED_TIER_MODES: TierModeOption[] = [
  { value: 'all', label: 'Any paid tier' },
  { value: 'selected', label: 'Selected tier(s)' },
];
const UPGRADED_TIER_MODES: TierModeOption[] = [
  { value: 'all', label: 'Any higher tier' },
  { value: 'selected', label: 'Specific tier(s)' },
];

type TierOption = (typeof TIER_OPTIONS)[number];

// The v3 trigger's From and To fields: the shared chip picker, unchanged, with
// one extra option that stands for "all of them" — "Any paid tier" on From,
// "Free" on To. That option and the tiers are either/or, so picking one replaces
// the other. Both fields start empty, on the placeholder; empty is unanswered
// (see transitionUnanswered).
//
// PROPOSED, demo only: the overall option shows as the field's plain value,
// like a Select's, rather than as a chip. Done by dressing its chip as text —
// no fill, no ×, the field's own type — so the shared picker stays untouched.
// It is still a chip underneath (a button labelled "Remove …"); a real version
// belongs in the picker itself.
//
// pl-[9px]: the field's own 3px inset plus this lands the text 12px in, where a
// Select's value sits. The badge's focus ring is switched off — on a value that
// reads as plain text it looked like a stray box. pointer-events-none lets a
// click on the text reach the field behind it and open the list, as a click on
// a Select's value does, instead of hitting the chip's own remove button.
const OVERALL_AS_TEXT =
  'pointer-events-none h-auto rounded-none bg-transparent pr-0 pl-[9px] text-(length:--text-control) font-normal text-foreground shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden';
const ANY_PAID_TIER: TierOption = { id: ANY_PAID_TIER_ID, name: 'Any paid tier' };
const FREE: TierOption = { id: FREE_TIER_ID, name: 'Free' };

const TransitionField: React.FC<{
  inputId: string;
  inputLabel: string;
  overall: TierOption;
  others: TierOption[];
  // Tier ids, or just the overall option's id. Empty: nothing chosen yet.
  selectedIds: string[];
  invalid: boolean;
  onChange: (ids: string[]) => void;
}> = ({ inputId, inputLabel, overall, others, selectedIds, invalid, onChange }) => {
  // Highest first, as the tiers settings list them.
  const tiers = [...others].reverse();
  const overallChosen = selectedIds.includes(overall.id);
  const selected = overallChosen
    ? [overall]
    : tiers.filter((tier) => selectedIds.includes(tier.id));
  // Kept in the site's order however they're picked.
  const ordered = (ids: string[]) => ALL_TIER_IDS.filter((id) => ids.includes(id));
  // While the field shows its overall value as plain text it should read as a
  // Select, so no blinking caret — until something is typed to search the list.
  const [search, setSearch] = useState('');
  const hideCaret = overallChosen && search === '';
  // The overall option first, then the tiers under a "Specific tiers" heading —
  // the picker's own group heading and separator, as Shade's lists draw them.
  // The heading says the rule: the option above stands alone, these combine.
  const sectionName = (tier: TierOption): string | undefined =>
    tier.id === overall.id ? undefined : 'Specific tiers';
  return (
    <div
      className={cn(
        // The picker keeps 80px for its search input on the chips' line; with
        // three tiers that doesn't fit, so the empty input wrapped onto a line
        // of its own and the field grew. 24px still takes a click and a typed
        // character.
        '[&_input]:min-w-6',
        hideCaret && '[&_input]:caret-transparent',
      )}
    >
      <ChipPicker<TierOption, TierOption>
        chipClassName={(chip) =>
          chip.id === overall.id ? OVERALL_AS_TEXT : 'text-(length:--text-control)'
        }
        chipVariant={() => 'secondary'}
        emptyMessage="No tiers found"
        getGroup={sectionName}
        getKey={(tier) => tier.id}
        getLabel={(tier) => tier.name}
        inputId={inputId}
        inputLabel={inputLabel}
        invalid={invalid && selectedIds.length === 0}
        matches={(tier, term) => tier.name.toLowerCase().includes(term.toLowerCase())}
        options={[overall, ...tiers]}
        placeholder="Select tiers..."
        renderOption={(tier, { chosen }) => (
          <>
            <span className="truncate">{tier.name}</span>
            {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
          </>
        )}
        selected={selected}
        onAdd={(tier) =>
          onChange(
            tier.id === overall.id
              ? [overall.id]
              : ordered([...selectedIds.filter((id) => id !== overall.id), tier.id]),
          )
        }
        onRemove={(id) => onChange(selectedIds.filter((tierId) => tierId !== id))}
        onSearchChange={setSearch}
      />
    </div>
  );
};

interface TriggerConfigFormProps {
  config: TriggerConfig;
  onChange: (next: TriggerConfig) => void;
  // Off in phase 1 (simple triggers): the exit sentence belongs to the
  // general-model lanes, where exits are part of what's being explored. A
  // `locked` prop lived here too — phase 1's saved trigger, fields hidden —
  // and went when locked cards stopped rendering this form at all (the canvas
  // draws them header-only; see triggerBodyEmpty there).
  showExits?: boolean;
  // Phase 1's plainer trigger wording — see SIMPLE_TRIGGER_LABELS. Keeps that
  // lane's paid field label as it was while the other lanes' copy moves.
  simpleNames?: boolean;
  // The SAVED config's tiers. An archived tier is offered while it's in the
  // current selection OR here — so unticking one stays reversible for exactly
  // as long as the removal is unsaved, the same undo horizon as every other
  // edit on the screen. Without it (older lanes), unticking an archived tier
  // removes its row at once.
  savedTierIds?: string[];
  // An unanswered field, as the message that fixes it — when the screen shows
  // faults on the fields themselves (see the edit canvas's faultDisplay). The
  // trigger's field goes Shade's invalid red and the message sits under it.
  error?: string;
}

export const TriggerFieldsForm: React.FC<TriggerConfigFormProps> = ({
  config,
  onChange,
  showExits = true,
  simpleNames = false,
  error,
  savedTierIds = [],
}) => {
  const tierIds = config.tierIds;
  const allMode = config.tierMode === 'all';
  const tierModeId = useId();
  const changeId = useId();
  const fromId = useId();
  const toId = useId();
  const transitionLabelId = useId();
  const tiersErrorId = useId();
  // Site state, read here like Stripe is in the empty-state picker: which
  // tiers have gone quiet decides what the field and its rows say.
  const archivedTierIds = useArchivedTierIds();
  const selectedTiers = TIER_OPTIONS.filter((tier) => tierIds.includes(tier.id));
  const showTiers = hasTiers(config);
  const started = config.type === 'paid_subscription_starts';
  // The v2 lifecycle lane's combined trigger: which change comes first, and the
  // tiers below it only exist for an upgrade (hasTiers already knows that).
  const showChange = config.type === 'paid_subscription_changed';
  // The v3 lane's trigger: a move from one tier (or any) to another (or free).
  const showTransition = config.type === 'paid_tier_changed';
  const transition = tierTransition(config);
  // Label and segment: the same control, one with creation and one without —
  // see shared/searchable-select-field, which owns their search and dropdown.
  const showLabels = hasLabels(config);
  const labels = useLabels();
  const showSegment = hasSegment(config);
  const segments = useSegments();
  const selectedSegment = segments.find((segment) => segment.id === config.segmentId) ?? null;

  const setTiers = (next: string[]) => onChange({ ...config, tierIds: next });
  const setLabel = (labelId: string | null) => onChange({ ...config, labelId });
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

      {/* TIERS, on the paid trigger only — as TWO fields, the post editor's
                access section exactly (editor/settings/access-section): a Select
                for the mode, then, only under "Selected tier(s)", the shared
                ChipPicker for which ones.

                It was one field-that-opens holding a radio pair and a checkbox
                list in a popover. The split keeps what that got right — a mode
                choice and an item choice are different questions and look it —
                and drops the bespoke surface: both halves are now controls the
                rest of Admin already uses, with their keyboard and screen-reader
                behaviour, rather than a button wearing input chrome.

                The sentence label belongs to the mode Select (a real <label>);
                the chip field is named "Tiers" for assistive tech and reads as
                the Select's continuation visually, the way it does in the
                editor. The error and the exits sit under whichever field is
                last. */}
      {showTransition && (
        <div aria-labelledby={transitionLabelId} className="flex flex-col gap-6" role="group">
          <span className="text-control" id={transitionLabelId}>
            {TRANSITION_FIELD_LABEL}
          </span>
          <Field>
            <FieldLabel htmlFor={fromId}>From</FieldLabel>
            <TransitionField
              inputId={fromId}
              inputLabel="From"
              invalid={Boolean(error)}
              others={TIER_OPTIONS}
              overall={ANY_PAID_TIER}
              selectedIds={transition.from}
              onChange={(fromTierIds) =>
                onChange({
                  ...config,
                  fromTierIds,
                  // A tier can't be both where a member starts and where they go.
                  toTierIds: transition.to.filter((id) => !fromTierIds.includes(id)),
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={toId}>To</FieldLabel>
            <TransitionField
              inputId={toId}
              inputLabel="To"
              invalid={Boolean(error)}
              others={TIER_OPTIONS.filter((tier) => !transition.from.includes(tier.id))}
              overall={FREE}
              selectedIds={transition.to}
              onChange={(toTierIds) => onChange({ ...config, toTierIds })}
            />
            {/* Only for a move to free, where the timing is the surprise: the
                trigger fires when the subscription actually ends, which can be
                most of a year after the member cancels. For a move between
                tiers the two fields already say everything this would. The
                field's own description, Shade's standard help text (a grey
                box, then warning and info Banners were tried first). */}
            {transition.toFree && (
              <FieldDescription>
                Members start this automation when their subscription expires, not when they cancel.
              </FieldDescription>
            )}
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </div>
      )}

      {showChange && (
        <div className="flex flex-col gap-2">
          <Label className="leading-normal font-normal" htmlFor={changeId}>
            {CHANGE_FIELD_LABEL}
          </Label>
          <Select
            value={subscriptionChange(config)}
            // The tiers belong to an upgrade, so changing the change clears them.
            onValueChange={(change) =>
              onChange({ ...config, change: change as SubscriptionChange, tierIds: [] })
            }
          >
            <SelectTrigger id={changeId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showTiers && (
        <div className="flex flex-col gap-2">
          {/* leading-normal / font-normal: Shade's Label is a one-line medium
                    caption by default, and this is a sentence that wraps and
                    matches the span labels the other trigger fields use. */}
          <Label className="leading-normal font-normal" htmlFor={tierModeId}>
            {started
              ? simpleNames
                ? SIMPLE_PAID_TIERS_FIELD_LABEL
                : PAID_TIERS_FIELD_LABEL
              : showChange
                ? CHANGE_TIERS_FIELD_LABEL
                : UPGRADED_TIERS_FIELD_LABEL}
          </Label>
          <Select
            value={config.tierMode}
            // Flipping mode clears the list either way: an answer given under
            // one mode isn't an answer under the other, and "Selected tier(s)"
            // starts EMPTY on purpose — pre-filling every tier would look like
            // "any" without following tiers created later.
            onValueChange={(mode) =>
              onChange({ ...config, tierMode: mode as TriggerConfig['tierMode'], tierIds: [] })
            }
          >
            <SelectTrigger
              // The mode can't be the unanswered half — only an empty chip
              // field can — so the Select never wears the error itself.
              id={tierModeId}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(started ? STARTED_TIER_MODES : UPGRADED_TIER_MODES).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!allMode && (
            <ChipPicker<TierOption, TierOption>
              chipClassName={() => 'text-(length:--text-control)'}
              chipVariant={() => 'secondary'}
              describedBy={error ? tiersErrorId : undefined}
              emptyMessage="No tiers found"
              getKey={(tier) => tier.id}
              getLabel={(tier) => tierDisplayName(tier.name, archivedTierIds.includes(tier.id))}
              inputLabel="Tiers"
              invalid={Boolean(error)}
              matches={(tier, term) => tier.name.toLowerCase().includes(term.toLowerCase())}
              // ACTIVE tiers only, and no group headings — unlike the editor,
              // an automation can't usefully watch a tier nobody can join. The
              // one exception is a tier archived AFTER it was chosen: it stays
              // offered while it's in the current selection or the saved one,
              // so removing its chip is reversible until that removal is saved.
              options={TIER_OPTIONS.filter(
                (tier) =>
                  !archivedTierIds.includes(tier.id) ||
                  tierIds.includes(tier.id) ||
                  savedTierIds.includes(tier.id),
              )}
              placeholder="Select tiers..."
              renderOption={(tier, { chosen }) => (
                <>
                  <span className="truncate">
                    {tierDisplayName(tier.name, archivedTierIds.includes(tier.id))}
                  </span>
                  {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
                </>
              )}
              selected={selectedTiers}
              // Kept in ALL_TIER_IDS order however they're picked, so the chips
              // always list tiers the way the site orders them.
              onAdd={(tier) =>
                setTiers(ALL_TIER_IDS.filter((id) => id === tier.id || tierIds.includes(id)))
              }
              onRemove={(id) => setTiers(tierIds.filter((tierId) => tierId !== id))}
            />
          )}
          {/* The exits, on the CARD under the fields — the same placement every
                    trigger with a field uses, so the card means one thing whichever
                    trigger it holds. */}
          {error && <FieldError id={tiersErrorId}>{error}</FieldError>}
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
            invalid={Boolean(error)}
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
          {error && <FieldError>{error}</FieldError>}
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
            invalid={Boolean(error)}
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
          {error && <FieldError>{error}</FieldError>}
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
