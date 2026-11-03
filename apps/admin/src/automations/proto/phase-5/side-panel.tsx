import React, { useId, useState } from 'react';
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { LeftPanelProps } from '@/automations/proto/shared/left-panel-types';
import { LeftPanel } from './left-panel';

// The side panel: docked at the screen's left under the header, as in phase 1
// and the shipping editor, with two tabs. (It spent a while as a full-height
// column at the right edge; that move is out of scope for this phase.)
//
// Performance is the pane this lane has always had — the chart, the counts and
// the members. Settings is new here: it's what the gear beside the title used to
// open as a sheet over the canvas. With the panel moved to the right, a sheet
// sliding in from the same edge would have stacked on it, and the right-panel
// concept had already shown the automation's settings reading well as a tab next
// to its numbers. So the gear went, and Settings is one tab over.
//
// The fields keep the sheet's rules exactly: they write through to the screen's
// draft as you type, the header retitles live, and the header's Save is the one
// commit. There is still no commit control in here.

export type PaneTab = 'performance' | 'settings';

interface SidePanelProps extends LeftPanelProps {
  tab: PaneTab;
  onTabChange: (tab: PaneTab) => void;
  settings: {
    values: { name: string; description: string };
    onChange: (next: { name: string; description: string }) => void;
    // When a member's run ends early, as a sentence — the trigger card's exit
    // sentence, moved here. null while no trigger is chosen.
    exits: string | null;
  };
}

// No Name field: the header's title is where an automation is renamed (see
// editable-title), so the name has one home.
const SettingsFields: React.FC<SidePanelProps['settings']> = ({ values, onChange, exits }) => {
  const descriptionHelpId = useId();
  return (
    // 2xl = gap-8, 32px between fields — the right-panel concept's settings spacing.
    <Stack className="px-6 pb-6" gap="2xl">
      {/* No placeholder: the name already says what the automation is for, and
          teams use this for whatever they need — decisions, constraints, notes.
          The help line says who sees it, since elsewhere in Ghost a description
          is often shown to members. */}
      <Field>
        <FieldLabel htmlFor="automation-description">Description</FieldLabel>
        <Textarea
          aria-describedby={descriptionHelpId}
          id="automation-description"
          rows={3}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
        />
        <FieldDescription id={descriptionHelpId}>
          Only visible to you and your team.
        </FieldDescription>
      </Field>
      {/* STOP CONDITIONS — an explanation, not a setting, this phase. The
          sentence is derived from the trigger (see exitSentence), and it used to
          sit under the trigger card's fields; it's here because when a run ends
          is a property of the automation, and Settings is where the rest of
          those live. Controls come in a later phase — the right-panel concept
          sketches them as a criteria table with goals. */}
      <Field>
        <FieldLabel>Stop conditions</FieldLabel>
        <FieldDescription>
          {exits ?? 'Choose a trigger to see when members stop early.'}
        </FieldDescription>
      </Field>
    </Stack>
  );
};

export const SidePanel: React.FC<SidePanelProps> = ({ tab, onTabChange, settings, ...pane }) => {
  // The top row's right-hand slot, where Performance portals its search and
  // filter controls (see left-panel). State rather than a ref so the pane
  // re-renders into it once it exists.
  const [stripSlot, setStripSlot] = useState<HTMLDivElement | null>(null);
  // Performance's search takes the whole row while it's open, as it took the
  // row from the pane's old title; the tab bar is HIDDEN for it rather than
  // unmounted, so closing search doesn't remount it either.
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col"
      value={tab}
      variant="button"
      onValueChange={(next) => onTabChange(next as PaneTab)}
    >
      {/* One row, one tab bar, for both tabs. It used to be a copy per tab,
          each in its own tab's strip — so every switch unmounted one and
          mounted the other a little way off, and Shade's transition-all on the
          triggers animated the new one in: the shift. Mounted once here, it
          never moves; only the slot's contents change.

          pt-4 pb-3 around an h-9 row, phase 1's strip: the row's centre lands
          on the pane toggle's, which is painted outside the pane at 16/16 of
          the row (see the detail screen). */}
      <div className="flex shrink-0 items-center px-6 pt-4 pb-3">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2">
          {/* An invisible twin of the pane toggle, holding its place so the
              tabs — and the search field when it takes the row — start clear
              of it. Kept in both states, as phase 1 does. aria-hidden and out
              of the tab order; the real button carries both. */}
          <Button
            className="invisible -ml-2 shrink-0"
            size="icon"
            tabIndex={-1}
            type="button"
            variant="ghost"
            aria-hidden
          >
            <LucideIcon.PanelLeft strokeWidth={2} />
          </Button>
          <TabsList className={cn(searchOpen && tab === 'performance' && 'hidden')}>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div ref={setStripSlot} className="flex min-w-0 flex-1 items-center justify-end gap-2" />
        </div>
      </div>
      {/* data-[state=inactive]:hidden because `flex` outranks Radix's own
          `hidden` on an inactive tab, and an inactive flex tab holds its height
          above the active one. */}
      <TabsContent
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        value="performance"
      >
        <LeftPanel {...pane} stripSlot={stripSlot} onSearchOpenChange={setSearchOpen} />
      </TabsContent>
      <TabsContent
        className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        value="settings"
      >
        <SettingsFields {...settings} />
      </TabsContent>
    </Tabs>
  );
};
