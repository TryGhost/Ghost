import React, { useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

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

// Field titles: Label's own 13px (text-control), a step heavier than its medium,
// so each field's name holds its own against the controls under it. Every title
// in the panel takes it — the exit table's column heads included.
const FIELD_TITLE = 'font-semibold';

// What the specimen rows can be set to, and the three it opens with — the
// reference's own. Hardcoded strings, not a model — see the field for why.
const EXIT_OPTIONS = [
  'Member upgraded',
  'Member downgraded',
  'Subscription renewed',
  'Subscription cancelled',
  'Member unsubscribed',
];

// The exit-criteria table's columns: the field, the Goal checkbox, and the
// remove button (size-9, 36px). Shared by the header and every row.
const EXIT_GRID = 'grid grid-cols-[minmax(0,1fr)_3rem_2.25rem] items-center gap-3';

interface ExitRow {
  id: number;
  event: string;
  goal: boolean;
}

const EXIT_SPECIMEN: ExitRow[] = [
  { id: 1, event: 'Member upgraded', goal: true },
  { id: 2, event: 'Subscription renewed', goal: true },
  { id: 3, event: 'Subscription cancelled', goal: false },
];

// Re-entry has no model behind it yet. It's here because the question is real — can
// a member go through this twice — and answering it in the panel is how we find out
// whether it belongs here or on the trigger.

export interface SettingsPanelProps {
  name: string;
  description: string;
  onDetailsChange: (next: { name: string; description: string }) => void;
  allowReentry: boolean;
  onAllowReentryChange: (next: boolean) => void;
  onArchive: () => void;
  className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  name,
  description,
  onDetailsChange,
  allowReentry,
  onAllowReentryChange,
  onArchive,
  className,
}) => {
  // Local, and it goes when the panel unmounts. Nothing else on this screen can see
  // it, which is the point — see the field.
  const [exits, setExits] = useState<ExitRow[]>(EXIT_SPECIMEN);
  const nextExit = EXIT_OPTIONS.find((option) => !exits.some((entry) => entry.event === option));
  return (
    <Stack className={cn('px-6 pb-8', className)} gap="2xl">
      <Stack gap="md">
        <Label className={FIELD_TITLE} htmlFor="automation-title">
          Title
        </Label>
        <Input
          className={FIELD_HOVER}
          id="automation-title"
          value={name}
          onChange={(e) => onDetailsChange({ name: e.target.value, description })}
        />
      </Stack>

      <Stack gap="md">
        <Label className={FIELD_TITLE} htmlFor="automation-description">
          Description
        </Label>
        <Textarea
          className={FIELD_HOVER}
          id="automation-description"
          rows={3}
          value={description}
          onChange={(e) => onDetailsChange({ name, description: e.target.value })}
        />
      </Stack>

      {/* EXIT CRITERIA — still a design specimen, not a setting. Nothing here
                writes anywhere, and nothing reads it back; exits are derived from the
                trigger and stated on its card (shared/trigger-config). This replaces
                the token-field specimen that stood here with the next pattern under
                review.

                A list of rows, one criterion each, and a column of checkboxes marking
                which are GOALS. Both end a member's run; a goal is the subset that
                counts as the automation having worked. Pairing them on one row rather
                than as two lists keeps "goal" a property of an exit, not a second set
                of conditions to keep in step with the first.

                Each row's menu offers only what no other row has taken, so the list
                can't hold a duplicate, and Add picks the next unused one — hidden
                once there are none left. Each row removes itself from its trailing trash can. */}
      <Stack gap="md">
        {/* Laid out as a table: the header and every row share one column
            template, so each column's content sits under its heading — the
            condition under "Exit condition", the checkbox centred under "Goal",
            the remove button in a headless column of its own at the end.
            Fixed widths for the two narrow columns (the checkbox's, and the
            icon button's size-9) are what keep them aligned row to row; the
            field takes what's left. */}
        {/* Column headings in the panel's field-label style, the same as Title
            and Description — they double as the section's heading, so there's no
            separate one above the table. A quieter table-head tier plus a
            heading over it was tried and read as too busy for three rows. */}
        <div className={EXIT_GRID}>
          <Label className={FIELD_TITLE}>Exit condition</Label>
          <Label className={cn(FIELD_TITLE, 'text-center')}>Goal</Label>
          <span aria-hidden />
        </div>
        {exits.map((row) => (
          <div key={row.id} className={EXIT_GRID}>
            <Select
              value={row.event}
              onValueChange={(event) =>
                setExits(exits.map((entry) => (entry.id === row.id ? { ...entry, event } : entry)))
              }
            >
              {/* shape="rounded": Shade's control radius rather than its pill
                  default — a row of full-width pills beside checkboxes read as
                  buttons, not fields. */}
              <SelectTrigger aria-label="Exit criterion" className={FIELD_HOVER} shape="rounded">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXIT_OPTIONS.filter(
                  (option) =>
                    option === row.event || !exits.some((entry) => entry.event === option),
                ).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Checkbox
              aria-label={`Set ${row.event} as goal`}
              checked={row.goal}
              className="justify-self-center"
              onCheckedChange={(checked) =>
                setExits(
                  exits.map((entry) =>
                    entry.id === row.id ? { ...entry, goal: checked === true } : entry,
                  ),
                )
              }
            />
            {/* Trailing remove, the row's last word — a trash can, the delete icon
                the canvas nodes use. Ghost, icon-sized and muted until hovered, so
                a column of them stays quieter than the fields they act on. */}
            <Button
              aria-label={`Remove ${row.event}`}
              className="text-muted-foreground hover:text-foreground"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setExits(exits.filter((entry) => entry.id !== row.id))}
            >
              <LucideIcon.Trash2 />
            </Button>
          </div>
        ))}
        {/* Add, as a small outline button with a leading plus, left-aligned
            under the rows. A text link read as one more label — same size,
            weight and colour — so it carries a border and an icon the headings
            don't, and sits a step shorter (sm, 28px) than the fields it adds
            to. Gone rather than disabled once every criterion is in use. */}
        {nextExit && (
          <Button
            className="self-start"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setExits([...exits, { id: Date.now(), event: nextExit, goal: false }])}
          >
            <LucideIcon.Plus strokeWidth={2} />
            Add
          </Button>
        )}
      </Stack>

      {/* A switch, not a two-option select. The question is yes or no — can someone
                enter twice — and a select made it look like there were more answers than
                that, with both of them phrased as sentences you had to read to tell apart.
                
                Label left, control right: the row states a property of the automation
                rather than asking for input, which is how every settings toggle in Ghost
                is laid out. */}
      <div className="flex items-center justify-between gap-4">
        <Label className={FIELD_TITLE} htmlFor="automation-reentry">
          Allow re-entry
        </Label>
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
        <Button type="button" variant="outline" onClick={onArchive}>
          <LucideIcon.Archive strokeWidth={2} />
          Archive
        </Button>
      </Inline>
    </Stack>
  );
};
