import React, { useState } from 'react';
import {
  Input,
  Button,
  Label,
  Switch,
  Textarea,
  Combobox,
  ComboboxContent,
  PopoverAnchor,
  inputSurface,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  EXIT_CRITERIA,
  type ExitCriterionId,
  type TriggerConfig,
} from '@/automations/proto/shared/trigger-config';

/**
 * EXPLORATION — the automation's settings as a column, rather than as a dialog and
 * a card between them.
 *
 * The other lanes split this: name and description live in a dialog behind the
 * header's ⋯, and exits live on the trigger card in the canvas. That works, but it
 * means the things ABOUT an automation are in two places and neither is where you
 * are when you're thinking about them. Here they're one panel, and the canvas is
 * left to be only the flow.
 *
 * Exits are a built list rather than a multi-select. Same data either way, but a
 * list you add to reads as a set you're assembling, where a field full of comma-
 * separated labels reads as one answer that happens to be long. It also gives each
 * condition somewhere to grow — a per-condition setting, a tier, a window — which
 * the multi-select had nowhere to put.
 */

// Every field in this panel darkens its stroke on hover.
//
// Shade only hovers the fields you PRESS — SelectTrigger and ComboboxTrigger fill on
// hover, Input and Textarea do nothing — which put a fill under the one control here
// that opens a list and left the two beside it flat. Correct by that rule, and wrong
// in a column: the odd one out looked like the only live thing on screen.
//
// A darker stroke says "this is interactive" without promising what pressing it does,
// so it reads the same on a field you type into and a field you open. If it holds up,
// it belongs in Shade's shared input surface rather than here.
const FIELD_HOVER = 'transition-colors hover:border-border-strong';

// Re-entry has no model behind it yet. It's here because the question is real — can
// a member go through this twice — and answering it in the panel is how we find out
// whether it belongs here or on the trigger.

export interface SettingsPanelProps {
  name: string;
  description: string;
  onDetailsChange: (next: { name: string; description: string }) => void;
  triggerConfig: TriggerConfig | null;
  onTriggerConfigChange: (next: TriggerConfig) => void;
  allowReentry: boolean;
  onAllowReentryChange: (next: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  name,
  description,
  onDetailsChange,
  triggerConfig,
  onTriggerConfigChange,
  allowReentry,
  onAllowReentryChange,
}) => {
  // Some criteria word themselves from the configuration ("Leave Bronze, Gold"),
  // so the list can't be built without one. Before a trigger is chosen there are no
  // exits to show either — nothing has been started, so nothing can end.
  const chosen = triggerConfig?.exitCriteria ?? [];
  // Narrowed once, so every label() call below has the configuration some of them
  // word themselves from ("Leave Bronze, Gold").
  const config = triggerConfig;
  // What's left to add. The field holds the rest, so the list never offers something
  // already sitting above it.
  const remaining = triggerConfig
    ? EXIT_CRITERIA.filter((criterion) => !chosen.includes(criterion.id))
    : [];
  const [exitsOpen, setExitsOpen] = useState(false);

  const setCriteria = (ids: ExitCriterionId[]) => {
    if (!triggerConfig) {
      return;
    }
    onTriggerConfigChange({ ...triggerConfig, exitCriteria: ids });
  };

  return (
    <Stack className="px-6 pb-8" gap="xl">
      <Stack gap="md">
        <Label htmlFor="automation-title">Title</Label>
        <Input
          className={FIELD_HOVER}
          id="automation-title"
          value={name}
          onChange={(e) => onDetailsChange({ name: e.target.value, description })}
        />
      </Stack>

      <Stack gap="md">
        <Label htmlFor="automation-description">Description</Label>
        <Textarea
          className={FIELD_HOVER}
          id="automation-description"
          rows={3}
          value={description}
          onChange={(e) => onDetailsChange({ name, description: e.target.value })}
        />
      </Stack>

      <Stack gap="md">
        <Label>Exit conditions</Label>
        {/* A token field, the way post settings takes tags and authors: the chosen
                    conditions are chips in the field, and the field opens a list of the ones
                    you haven't chosen.
                    
                    Post settings isn't Shade — it's the Ember admin on ember-power-select —
                    so there was nothing to import, only a behaviour to match. Two things
                    make it read like that control rather than like a multi-select wearing
                    chips: an option LEAVES the list once it's in the field, so the list is
                    always "what's left to add" rather than a set of ticks to reconcile
                    against the chips above it; and the chips are default-size Buttons with
                    a trailing X, which is the shape Shade's Filters pattern gives a chip.
                    
                    Secondary rather than outline. A token sits INSIDE a bordered field, and
                    an outlined chip put a second border a few pixels inside the first — two
                    edges describing one thing. A filled chip reads as contents of the field
                    rather than as controls parked in it, which is the difference between
                    this and the filter bar, where the chips stand on the page alone.
                    
                    A div rather than ComboboxTrigger's button: the chips are buttons, and a
                    button inside a button is invalid and unreachable by keyboard. The surface
                    is still that trigger's — inputSurface('within') is Shade's own base for a
                    field whose focusable content lives INSIDE it, and text-control is its type
                    size.
                    
                    No caret, though. A caret says the field has one value and pressing it
                    swaps that value; this one holds several and pressing it adds another. The
                    placeholder says "Add", which is the actual promise, and once there are
                    chips they say the rest. */}
        <Combobox open={exitsOpen} onOpenChange={setExitsOpen}>
          <PopoverAnchor asChild>
            <div
              className={cn(
                inputSurface('within'),
                FIELD_HOVER,
                'flex min-h-(--control-height) w-full cursor-pointer items-center gap-2',
                'p-1.5 text-control',
              )}
              role="presentation"
              onClick={() => setExitsOpen(true)}
            >
              {/* The chips wrap; the chevron doesn't. Without this they're siblings in
                                one wrapping row, and a second line of chips carries the chevron
                                down with it. */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {config &&
                  chosen.map((id) => {
                    const criterion = EXIT_CRITERIA.find((entry) => entry.id === id);
                    if (!criterion) {
                      return null;
                    }
                    return (
                      <Button
                        key={id}
                        aria-label={`Remove ${criterion.label(config)}`}
                        // sm — Shade's one step down: 28px with 12px text and a 12px X.
                        // At the default size each chip was as tall as the field's own
                        // controls, so two of them read as two stacked fields rather than
                        // as the contents of one.
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={(event) => {
                          // The field's own click would reopen the list under the chip
                          // that just went.
                          event.stopPropagation();
                          setCriteria(chosen.filter((entry) => entry !== id));
                        }}
                      >
                        {criterion.label(config)}
                        <LucideIcon.X strokeWidth={2} />
                      </Button>
                    );
                  })}
                {chosen.length === 0 && <span className="px-1.5 text-muted-foreground">Add</span>}
              </div>
            </div>
          </PopoverAnchor>
          {/* p-1 and the row metrics below are SelectContent's and SelectItem's, so an
                    option here is the same object as an option in any Shade select — 13px
                    text-control rather than 12px, rounded-xs, py-1.5 px-2. It had been a size
                    and a radius of its own. */}
          <ComboboxContent className="p-1" updatePositionStrategy="always">
            <div className="flex flex-col">
              {remaining.map((criterion) => (
                <button
                  key={criterion.id}
                  className="flex w-full cursor-default items-center rounded-xs px-2 py-1.5 text-left text-control transition-colors hover:bg-interactive-hover focus-visible:bg-interactive-hover focus-visible:outline-hidden"
                  type="button"
                  onClick={() =>
                    setCriteria(
                      EXIT_CRITERIA.map((entry) => entry.id).filter(
                        (id) => id === criterion.id || chosen.includes(id),
                      ),
                    )
                  }
                >
                  {config ? criterion.label(config) : criterion.id}
                </button>
              ))}
              {/* The list can empty, unlike a set of checkboxes — so it has to say so
                            rather than opening onto nothing. */}
              {remaining.length === 0 && (
                <p className="px-2 py-1.5 text-control text-muted-foreground">
                  All conditions added
                </p>
              )}
            </div>
          </ComboboxContent>
        </Combobox>
      </Stack>

      {/* A switch, not a two-option select. The question is yes or no — can someone
                enter twice — and a select made it look like there were more answers than
                that, with both of them phrased as sentences you had to read to tell apart.
                
                Label left, control right: the row states a property of the automation
                rather than asking for input, which is how every settings toggle in Ghost
                is laid out. */}
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="automation-reentry">Allow re-entry</Label>
        <Switch
          checked={allowReentry}
          id="automation-reentry"
          onCheckedChange={onAllowReentryChange}
        />
      </div>
    </Stack>
  );
};
