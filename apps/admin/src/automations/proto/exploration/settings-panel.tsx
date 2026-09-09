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
          id="automation-title"
          value={name}
          onChange={(e) => onDetailsChange({ name: e.target.value, description })}
        />
      </Stack>

      <Stack gap="md">
        <Label htmlFor="automation-description">Description</Label>
        <Textarea
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
                    button inside a button is invalid and unreachable by keyboard. */}
        <Combobox open={exitsOpen} onOpenChange={setExitsOpen}>
          <PopoverAnchor asChild>
            <div
              className={cn(
                'flex w-full cursor-pointer flex-wrap items-center gap-1.5',
                'min-h-(--control-height) rounded-md border border-control-border p-1.5',
                'focus-within:ring-1 focus-within:ring-focus-ring',
              )}
              role="presentation"
              onClick={() => setExitsOpen(true)}
            >
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
              {chosen.length === 0 && (
                <span className="px-1.5 text-sm text-muted-foreground">Select</span>
              )}
            </div>
          </PopoverAnchor>
          <ComboboxContent className="p-2" updatePositionStrategy="always">
            <div className="flex flex-col gap-0.5">
              {remaining.map((criterion) => (
                <button
                  key={criterion.id}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-interactive-hover focus-visible:bg-interactive-hover focus-visible:outline-none"
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
                <p className="px-2 py-1.5 text-sm text-muted-foreground">All conditions added</p>
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
