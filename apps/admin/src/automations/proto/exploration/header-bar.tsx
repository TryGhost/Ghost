import React, { useState } from 'react';
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Separator,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// EXPLORATION — the screen's header, flat: no fill and no rule, so the page
// background runs straight through it. Once the canvas is a bounded window, a
// bounded header above it makes two competing frames and the eye has to pick
// which one is the object.
//
// Two zones on one row: navigation and identity at the left — back arrow, title,
// and a way into the automation's settings — and the screen's actions at the
// right, ending in the on/off switch.
//
// WHAT THIS LANE IS TRYING, and how it differs from the other two:
//
// No status badge. On/off stops being something the header REPORTS beside the
// title and becomes something it OFFERS at the right, as a switch. A badge plus a
// "Turn on" button plus a "Turn off" menu row was the same one fact in three
// places, none of which was the control. The switch's position is the status.
//
// Settings gets an icon beside the title rather than a row in the ⋯. It was the
// only item in that menu that opened a place rather than doing a thing, which is
// what made it sit oddly among Duplicate and Discard — and settings are ABOUT the
// title, so next to it is where they can be found without opening anything.
//
// This is deliberately not what phase 1 and 2 do. If it earns its way over, the
// thing to carry across is the switch; the icon is the cheaper half.
//
// A centred "Automations / <name>" breadcrumb has now been tried here twice and
// rejected twice, on the same ground both times: it puts the automation's name at
// the middle of the screen while the control that leaves it sits at the edge, so
// the two halves of "where am I and how do I get out" end up apart. Centring does
// hold the title still while the pane opens and closes behind it — that's the one
// thing it's genuinely better at — but it isn't worth splitting identity from
// navigation, and a crumb that doubles as the way back still reads as a label
// first. If it comes up a third time, this is the objection to answer.
// The on/off control: a button with the state written in it and a switch beside it.
//
// Four earlier arrangements tried to say the state twice — a badge next to a switch,
// a switch tinted like the badge, the badge's pill wrapped around a switch, then the
// badge redrawn AS the switch. All of them were a readout and a control competing
// for the same fact, and the last one solved that by inventing a control Ghost
// doesn't otherwise have.
//
// This one is the word and the switch as a single control, so there is nothing on
// the other side of the header doing the communicating and nothing new to learn.
//
// Ghost rather than outline. It was outlined, which made it a button sitting beside
// other buttons — three bordered boxes in a row, none of which was obviously the
// state. Unbordered it reads as what it is: the automation's status, which happens
// to be operable. What separates it from the actions is a rule, not a box.
//
// "Live", not "On", because this control replaced the badge and inherited its job:
// it's the list's word (and production's), and a control that said "On" beside a
// list that said "Live" would be the same fact under two names. Live and Off aren't
// a natural antonym pair, which is the cost — but Live says the automation is
// enrolling members right now, and On doesn't say anything.
//
// A button with role="switch" rather than a real Switch inside a button: nesting two
// interactive elements is a bug in waiting, and to a screen reader this is exactly
// what a switch is.
// Exported so the floating HUD can raise the same control when the header itself is
// hidden — the chrome moves, the control doesn't change.
export const StatusSwitch: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  onChange: (next: boolean) => void;
}> = ({ status, canGoLive, onChange }) => {
  const on = status === 'active';
  // Never disabled — a blocked turn-on explains itself in a popover at the point
  // of the press, rather than greying out and leaving the why somewhere else on
  // the screen. Turning off is never blocked. Same treatment in every lane with
  // a switch (see phase-2's copy for the full rationale).
  const [blockedOpen, setBlockedOpen] = useState(false);
  return (
    <Popover open={blockedOpen} onOpenChange={setBlockedOpen}>
      <PopoverAnchor asChild>
        <Button
          aria-checked={on}
          aria-label="Automation live"
          // The only deviation from the component: gap-2 rather than its gap-1.5, which
          // is sized for a 16px icon and reads tight against a 28px switch. Height,
          // radius, padding and type are all the button's own.
          className="gap-2"
          role="switch"
          type="button"
          variant="ghost"
          onClick={() => {
            if (!on && !canGoLive) {
              setBlockedOpen(true);
              return;
            }
            onChange(!on);
          }}
        >
          {/* No type classes: the label inherits the button's text-control (13px) and
                font-medium, so it matches every other button rather than being a size of
                its own. */}
          <span>{on ? 'Live' : 'Off'}</span>
          {/* Decorative: the button is the control, and a second focusable thing inside
                it would be one tab stop too many. Shade's unchecked fill, so it reads as
                the same component even though it can't be one here.
                
                20x36 with a 16px thumb — one step up from Shade's own 16x28, which is
                sized to sit in a settings list rather than to carry a header's primary
                state. Travel is the width less the thumb and both insets: 36 - 16 - 4. */}
          <span
            className={cn(
              'inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
              on ? 'bg-green-500' : 'bg-input',
            )}
            aria-hidden
          >
            <span
              className={cn(
                'size-4 rounded-full bg-white transition-transform duration-200 ease-out motion-reduce:transition-none',
                on ? 'translate-x-4.5' : 'translate-x-0.5',
              )}
            />
          </span>
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-72">
        <p className="text-md">Fix all issues to publish this automation.</p>
      </PopoverContent>
    </Popover>
  );
};

interface HeaderBarProps {
  title: string;
  status: 'active' | 'inactive';
  onBack: () => void;
  // The screen's chrome actions, passed as a node rather than rebuilt here so
  // both header variants raise identical controls — a header style shouldn't
  // change what the screen lets you do.
  actions: React.ReactNode;
  // Asks for the status to change. The screen decides what that costs — turning
  // off confirms first — so the switch reports `status` and never its own guess:
  // a switch that flips before the answer is a switch that can be wrong.
  onStatusChange: (next: boolean) => void;
  // Nothing to turn on yet — an automation with no trigger has nothing to run.
  canGoLive: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  status,
  onBack,
  actions,
  onStatusChange,
  canGoLive,
}) => (
  <header
    className={cn(
      // px-6: the same 24px column the pane and the canvas HUD use, so every
      // leading control on the screen starts on one line rather than three.
      // Hugs its contents with 24px on every side, the way the post editor's header
      // does, rather than standing at a fixed height with only horizontal padding. The
      // row is as tall as the tallest control in it plus its margins — so changing a
      // control's size changes the header, instead of leaving it centred in a number
      // that no longer means anything.
      'relative z-30 flex shrink-0 items-center justify-between p-6',
    )}
  >
    {/* Identity sits with navigation at the left rather than centred: the title
            is what you came here for, and the way back belongs beside it. min-w-0 so
            a long automation name truncates instead of pushing the actions off. */}
    <Inline align="center" className="min-w-0" gap="sm">
      {/* No negative inset. It used to pull back 8px so the arrow's 16px GLYPH landed
                optically on the 24px column rather than the button's box — right when the
                header only had horizontal padding and the button was the first mark on an
                otherwise empty row.
                
                Now that the header pads 24px on every side, that reads as the padding
                failing on one edge: the box visibly starts before the line the rest of the
                header keeps. The padding wins — a consistent box inset beats an optical
                glyph inset once there's an edge above and below it to compare against. */}
      <Button
        aria-label="Back to automations"
        size="icon"
        type="button"
        variant="ghost"
        onClick={onBack}
      >
        <LucideIcon.ArrowLeft strokeWidth={2} />
      </Button>
      {/* text-lg (15px), matching the shipping automation header's own name
                verbatim. The screen's subject should be the largest thing on it; at
                text-md it was a step BELOW the pane heading beneath it, which inverted
                the hierarchy — the region label outranking the thing it reports on. */}
      {/* Plain text. It was a button with a trailing cog, opening the name and
                description in a dialog — that moved into the pane's Settings panel, and a
                second way in would be two places to change one thing. The title is a label
                again, which is all it was ever claiming to be. */}
      <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
    </Inline>

    <Inline align="center" className="shrink-0" gap="sm">
      {actions}
      {/* A rule, not a border. The status isn't another action — it's what the
                actions are acting on — so it's set apart rather than lined up with them.
                h-5 rather than full height: a hairline the height of the row would divide
                the header, where this only divides the group. */}
      <Separator className="h-5" orientation="vertical" />
      {/* Ends the row, past the ⋯ and any primary action. It's the only control
                here that changes what the automation DOES rather than what you're looking
                at, so it gets the far edge to itself. */}
      <StatusSwitch canGoLive={canGoLive} status={status} onChange={onStatusChange} />
    </Inline>
  </header>
);
