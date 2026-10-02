import React, { useEffect, useState } from 'react';
import {
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import type { LeftPanelProps } from '@/automations/proto/shared/left-panel-types';
import { LeftPanel } from './left-panel';

// The side panel: a full-height column at the screen's right edge, two tabs.
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
    // Whether the CURRENT field text names another automation — the screen's
    // live check. The screen keeps a colliding name off the draft; this only
    // drives what the field says about it.
    nameTaken: boolean;
    // When a member's run ends early, as a sentence — the trigger card's exit
    // sentence, moved here. null while no trigger is chosen.
    exits: string | null;
  };
}

// How long a collision has to hold still before the field says so. Extending an
// existing name passes THROUGH a collision — typing "Welcome series 2" is
// momentarily "Welcome series" — and an error on that keystroke scolds people
// mid-thought. Only the message waits; the guard is per keystroke.
const ERROR_DEBOUNCE_MS = 450;

const SettingsFields: React.FC<SidePanelProps['settings']> = ({
  values,
  onChange,
  nameTaken,
  exits,
}) => {
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!nameTaken) {
      setShowError(false);
      return;
    }
    const timer = setTimeout(() => setShowError(true), ERROR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // values.name restarts the timer on every keystroke — the message appears
    // only once a colliding value has been LEFT there.
  }, [nameTaken, values.name]);

  return (
    // 2xl = gap-8, 32px between fields — the right-panel concept's settings spacing.
    <Stack className="px-6 pb-6" gap="2xl">
      <div className="flex flex-col gap-2">
        <Label htmlFor="automation-name">Name</Label>
        <Input
          aria-invalid={showError || undefined}
          id="automation-name"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
        {/* Present only while true — the row appearing is itself the signal.
            aria-live so it's announced without moving focus off the field. */}
        {showError && (
          <p aria-live="polite" className="text-xs text-destructive">
            An automation with this name already exists.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="automation-description">Description</Label>
        <Textarea
          id="automation-description"
          placeholder="What this automation is for"
          rows={3}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
        />
      </div>
      {/* EXIT CONDITIONS — an explanation, not a setting, this phase. The
          sentence is derived from the trigger (see exitSentence), and it used to
          sit under the trigger card's fields; it's here because when a run ends
          is a property of the automation, and Settings is where the rest of
          those live. Controls come in a later phase — the right-panel concept
          sketches them as a criteria table with goals. */}
      <Stack gap="sm">
        <Label>Exit conditions</Label>
        <p className="text-control text-muted-foreground">
          {exits ?? 'Choose a trigger to see when members exit this automation.'}
        </p>
      </Stack>
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

          h-9 holds the row at the 36px of Performance's icon buttons even on
          Settings, where the slot is empty; with py-3.5 that's 64px, centred the
          way the header centres its row, so the tabs sit on its line and the
          pinned toggle lines up with both. */}
      <div className="flex shrink-0 items-center px-6 py-3.5">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2">
          <TabsList className={cn(searchOpen && tab === 'performance' && 'hidden')}>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div ref={setStripSlot} className="flex min-w-0 flex-1 items-center justify-end gap-2" />
          {/* The pinned sidebar toggle's footprint — it sits over this end of
              the row while the panel is open (see the detail screen). */}
          <span className="size-8 shrink-0" aria-hidden />
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
