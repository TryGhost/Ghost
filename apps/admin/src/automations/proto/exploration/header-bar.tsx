import React from 'react';
import { Button } from '@tryghost/shade/components';
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
// The status badge and the on/off control, as one object.
//
// Three arrangements came before this: a green switch beside the badge, the badge's
// pill wrapped around a switch, then the badge and a plain switch side by side. All
// three had the same problem — the state was being said twice, once as a readout and
// once as a control, and no amount of styling made two things look like one fact.
//
// So the badge IS the switch. Its dot is the thumb, its label is the label — one
// object, nothing duplicated, because there's only one of it.
//
// Solid fills with a white thumb and white label, rather than the badge's pale green
// on green. A badge is a quiet readout in a list of twenty; this is a single control
// in a header, and it has to look like something you operate. The solid field also
// carries the state on its own, which is what lets the label be white in both
// positions and the whole thing work on either theme without a dark variant.
//
// The thumb travels right to turn ON, as every other switch does. That's the one
// place this stops imitating the badge: the badge leads with its dot, so mirroring it
// literally would have put ON at the left and read as off to anyone who didn't stop
// to look. Convention wins over resemblance — the fill and the label still carry it.
//
// Not Shade's Switch. That renders its own thumb and takes no children, so a label
// can't go inside it, and every version above was fighting its internals through
// child selectors. A button with role="switch" is the same thing to a screen reader.
const StatusSwitch: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  onChange: (next: boolean) => void;
}> = ({ status, canGoLive, onChange }) => {
  const on = status === 'active';
  return (
    <button
      aria-checked={on}
      aria-label="Automation on"
      // 24px tall. Shade's own switch is 16, which was the right number for a switch
      // and the wrong one for a switch with a word inside it — at that height the
      // label had no room and the pill went long and thin. 24 sits well under the
      // header's 34px buttons rather than setting its own line.
      //
      // Fixed width so the pill doesn't resize as ON becomes OFF, and so the thumb
      // has a constant distance to travel. 56 = 2 inset + 20 thumb + 32 travel + 2.
      // The travel is set by OFF, the longer of the two words: the thumb has to clear
      // it, so the pill can only be as short as "OFF" plus a thumb plus air.
      className={cn(
        'relative h-6 w-14 shrink-0 rounded-full transition-colors',
        'focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden',
        'disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'bg-green-500' : 'bg-grey-600',
      )}
      disabled={!on && !canGoLive}
      role="switch"
      type="button"
      onClick={() => onChange(!on)}
    >
      {/* The badge's dot at the badge's size, grown into a thumb. White in both
                states — the track is what changes, and a thumb that changed with it would
                be a second thing to read. */}
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200 ease-out motion-reduce:transition-none',
          on ? 'translate-x-8' : 'translate-x-0',
        )}
      />
      {/* Sits in whichever half the thumb isn't using. Its position swaps rather than
                sliding: the word itself changes at the same moment, so animating it across
                would be animating one label into a different one.
                
                text-sm, which 24px has the room for — 16px did not, which is most of
                why this isn't Shade's switch height. */}
      <span
        className={cn(
          'absolute inset-y-0 flex items-center text-sm font-medium text-white uppercase',
          on ? 'left-1.5' : 'right-1.5',
        )}
      >
        {on ? 'On' : 'Off'}
      </span>
    </button>
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
  // Opens the automation's settings, from the icon beside the title.
  onOpenSettings: () => void;
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
  onOpenSettings,
  onStatusChange,
  canGoLive,
}) => (
  <header
    className={cn(
      // px-6: the same 24px column the pane and the canvas HUD use, so every
      // leading control on the screen starts on one line rather than three.
      'relative z-30 flex h-16 shrink-0 items-center justify-between px-6',
    )}
  >
    {/* Identity sits with navigation at the left rather than centred: the title
            is what you came here for, and the way back belongs beside it. min-w-0 so
            a long automation name truncates instead of pushing the actions off. */}
    <Inline align="center" className="min-w-0" gap="sm">
      {/* -ml-2, as everywhere a leading ghost icon button meets the inset: the
                box pulls back 8px so its 16px glyph lands optically on the 24px
                column, instead of the box sitting on it and the glyph landing 10px
                further in. The pane's own leading button does the same, which is
                what puts the two on one line down the left of the screen. */}
      <Button
        aria-label="Back to automations"
        className="-ml-2"
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
      {/* Title and cog are ONE control, not a label with a button after it. The
                name is the thing settings are about, so it should be the thing you click
                — the cog is the affordance that says so, and folding both into a single
                button makes the target the width of the name rather than 28px of icon.
                
                Persistent, not hover-revealed: an affordance that only appears on hover
                still has to reserve its width, so it pushes the title's line apart while
                advertising nothing.
                
                -ml-2 with px-2 so the hover fill has room without the text shifting off
                the line the back arrow's glyph sets. */}
      <button
        className="-ml-2 flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden"
        title="Automation settings"
        type="button"
        onClick={onOpenSettings}
      >
        <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
        <LucideIcon.Settings className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      </button>
    </Inline>

    <Inline align="center" className="shrink-0" gap="sm">
      {actions}
      {/* Ends the row, past the ⋯ and any primary action. It's the only control
                here that changes what the automation DOES rather than what you're looking
                at, so it gets the far edge to itself. */}
      <StatusSwitch canGoLive={canGoLive} status={status} onChange={onStatusChange} />
    </Inline>
  </header>
);
