import React from 'react';
import { Button, Input, Label, Switch, Textarea } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

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
  allowReentry: boolean;
  onAllowReentryChange: (next: boolean) => void;
  onDelete: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  name,
  description,
  onDetailsChange,
  allowReentry,
  onAllowReentryChange,
  onDelete,
}) => {
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

      {/* No exit conditions here any more. This panel held a token field for them —
                chips in the field, a list of the unchosen ones behind it — on the reasoning
                that what ENDS an automation belongs with its settings rather than on the
                trigger card.

                There's nothing left to hold. Exits are derived from the trigger and its
                tiers now and stated as a sentence on the card itself, which is the one
                place that can keep them honest: they change when the thing they follow
                from changes, in view, while you're changing it. See
                shared/trigger-config. */}

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

      {/* What you can do TO this automation, as opposed to what it's set to. It was
                in the header's ⋯ — which then existed for two items, and put the way to
                delete something at the top right of a screen whose top right is otherwise
                about publishing it.

                Delete alone. Duplicate stood beside it until a team run-through caught
                what it actually copied: with explicit save the screen holds two versions
                of the automation at once — saved, and your draft — and "Duplicate" names
                neither, so the copy silently took the unsaved edits with it. Prompting to
                save first only makes Duplicate interrogate you about automation A in order
                to create automation B. The verb needs ONE unambiguous subject, and the
                automations table is where it has one, so that's where it lives now.

                Delete has no such problem — it removes the whole thing, draft and all —
                and it stays here, last, because this is the end of the panel and a
                destructive action shouldn't sit above anything you might be reaching for.

                The colour is the whole warning at this size. It opens a confirm that says
                what's actually at stake — members mid-flow, and the run history — so the
                button doesn't have to. */}
      <Inline className="pt-2" gap="sm">
        <Button
          className="text-destructive hover:text-destructive"
          type="button"
          variant="outline"
          onClick={onDelete}
        >
          <LucideIcon.Trash2 strokeWidth={2} />
          Delete
        </Button>
      </Inline>
    </Stack>
  );
};
