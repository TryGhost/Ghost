import React, { useState } from 'react';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// EXPLORATION 2 — the screen's header as a persistent bar: its own fill, its own
// rule, and always on screen. This is the post editor's shape. The canvas below it
// runs full bleed to the window edges, so nothing else here is a bounded object and
// the bar is free to be one — it's the fixed edge the canvas scrolls and pans
// underneath, not a second frame competing with a rounded canvas window.
//
// Exploration 1 takes the opposite bet, where the canvas IS the object and the
// header dissolves into floating pills around it. Keeping both is the point: one
// lane can't answer whether chrome should hide until there's something to compare
// hiding against.
//
// Two zones on one row: navigation and identity at the left — back arrow, title,
// and a way into the automation's settings — and the screen's actions at the
// right, ending in the one that changes whether it runs.
//
// WHAT THIS LANE IS TRYING, and how it differs from the other two:
//
// No status badge, and no switch either. On/off stops being something the header
// REPORTS beside the title and becomes something it OFFERS at the right, as the
// last of a row of borderless buttons — which is exactly what the post editor
// does with Publish and Unpublish. A badge plus a "Turn on" button plus a
// "Turn off" menu row was the same one fact in three places, none of which was
// the control; the button's WORD is the status now, the same way "Update" tells
// you the post is already published.
//
// Settings gets an icon beside the title rather than a row in the ⋯. It was the
// only item in that menu that opened a place rather than doing a thing, which is
// what made it sit oddly among Duplicate and Discard — and settings are ABOUT the
// title, so next to it is where they can be found without opening anything.
//
// This is deliberately not what phase 1 and 2 do. If it earns its way over, the
// thing to carry across is the labelled status button; the icon is the cheaper half.
//
// A centred "Automations / <name>" breadcrumb has now been tried here twice and
// rejected twice, on the same ground both times: it puts the automation's name at
// the middle of the screen while the control that leaves it sits at the edge, so
// the two halves of "where am I and how do I get out" end up apart. Centring does
// hold the title still while the pane opens and closes behind it — that's the one
// thing it's genuinely better at — but it isn't worth splitting identity from
// navigation, and a crumb that doubles as the way back still reads as a label
// first. If it comes up a third time, this is the objection to answer.
// The on/off control, as one borderless button whose LABEL is the state: "Publish"
// while it's off, "Turn off" while it's live.
//
// Five earlier arrangements tried to say the state twice — a badge next to a switch,
// a switch tinted like the badge, the badge's pill wrapped around a switch, the badge
// redrawn AS the switch, and finally a switch with the word "Live" inside it. All of
// them were a readout and a control competing for the same fact, and the later ones
// solved that by inventing a control Ghost doesn't otherwise have.
//
// A button says it once. You read what pressing it will DO, and the state is the
// thing that must be true for that to be the offer — the post editor's whole trick,
// where "Update" is how you know the post is live. It also costs nothing to learn,
// which a bespoke labelled switch did.
//
// Colour carries the difference between the two, since the words alone are a weak
// signal at a glance: green for the one that starts something (the admin's existing
// green-action idiom, see settings/advanced/integrations), and the plain foreground
// for the one that stops it. Deliberately not --destructive: turning an automation
// off is reversible and routine, and red would file it with Delete.
// The metrics every button in this row shares, exported because "Update" is passed
// in from the screen and has to be the same object as the two defined here.
//
// This is measured off the real thing rather than guessed. The post editor's header
// buttons are `.gh-btn.gh-btn-editor` (ember-admin: components/editor/publish-
// buttons.hbs, styles/patterns/buttons.css), which come out at:
//
//   height 32px · font-size 1.3rem (13px) · font-weight 500 · padding 0 14px
//
// Shade's ghost button already IS the first three — h-(--control-height) is 32px,
// text-control is 13px, and the variant sets font-medium. So everything here is the
// component's own default and the only override is the padding: px-3.5 for the
// editor's 14px, against Shade's px-2.5. That 4px a side is the whole difference,
// and it's what was making these read as small — the type was never the problem.
//
// An earlier pass took them to 36px/14px/semibold to match the 36px icon buttons
// beside them. It made the row taller than the editor's and heavier than anything
// else in the admin. The icon buttons are the ones that don't match; leave that.
//
// COLOUR, verified against production rather than against the templates: exactly one
// button in the editor's header is ever green, and it is Publish. Draft shows Preview
// + Publish(green); published shows Update + Unpublish, both dark. (publish-buttons.
// hbs still carries @idleClass="green" on Update — that's stale, and the screen
// doesn't render it that way.) Green marks the one press that puts something in front
// of an audience for the first time, and nothing else competes for it.
export const HEADER_ACTION = 'px-3.5';

const StatusAction: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  onChange: (next: boolean) => void;
}> = ({ status, canGoLive, onChange }) => {
  const on = status === 'active';
  // Never disabled — a blocked publish explains itself in a popover at the point
  // of the press, rather than greying out and leaving the why somewhere else on
  // the screen. Turning off is never blocked. Same treatment every lane's
  // lifecycle control takes (see phase-2's StatusSwitch for the full rationale).
  const [blockedOpen, setBlockedOpen] = useState(false);
  return (
    <Popover open={blockedOpen} onOpenChange={setBlockedOpen}>
      <PopoverAnchor asChild>
        <Button
          className={cn(
            HEADER_ACTION,
            // green-600, not the --color-green alias. The editor paints its green button
            // --green-d1 — #30cf43 taken down 5% of HSL lightness, which lands around
            // #2bba3c — and green-600 is the nearest step on Shade's ramp; --color-green is
            // green-500, which IS the undarkened #30cf43 and reads as a highlight rather
            // than as the screen's primary offer.
            //
            // The other one takes no colour class at all: the editor's non-green header
            // buttons are --darkgrey, and the ghost variant's own --foreground is that
            // role's token here.
            !on && 'text-green-600 hover:text-green-600',
          )}
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
          {on ? 'Turn off' : 'Publish'}
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
  // off confirms first — so the button renders `status` and never its own guess: a
  // control that changes on click and then changes back is worse than one that waits.
  onStatusChange: (next: boolean) => void;
  // Whether the pane toggle's footprint has to be held at the end of this row.
  // The toggle is pinned to the SCREEN's top-right corner, and this header only
  // reaches that corner while the pane is collapsed — the rest of the time the pane
  // is what's under the toggle and reserves the space itself.
  reserveToggle?: boolean;
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
  reserveToggle = false,
}) => (
  <header
    className={cn(
      // 24px on every side, the way the post editor's header does it, rather than a
      // fixed height with only horizontal padding: the row is as tall as the tallest
      // control in it plus its margins, so changing a control's size changes the
      // header instead of leaving it centred in a number that no longer means
      // anything. The 24px is also the column the rail and the canvas controls use,
      // so every leading control on the screen starts on one line.
      'relative z-30 flex shrink-0 items-center justify-between p-6',
      // Its own surface, with a rule under it. The canvas below is full bleed and
      // carries a dot pattern to its own edges; without a fill here the pattern would
      // run up behind the title, and without the rule the bar's bottom edge would be
      // wherever the dots happened to start.
      'border-b bg-surface-elevated',
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
      {/* Ends the row, past any other action. It's the only control here that changes
                what the automation DOES rather than what you're looking at, so it gets the
                far edge to itself.

                No rule before it any more. The separator was fencing a READOUT off from
                the actions — "the status isn't another action" — and that argument goes
                with the switch: this is an action, lined up with the others, the way
                Preview and Publish are. */}
      <StatusAction canGoLive={canGoLive} status={status} onChange={onStatusChange} />
      {/* An invisible twin of the pane toggle, holding its place. The real one is
                pinned to the screen's corner so that collapsing the pane takes the pane out
                from under a button that never moves — which also means this row doesn't
                know it's there, and with the pane gone the last button ran under it.

                The same component rather than a sized box, so the space can't drift from
                the thing standing in it. aria-hidden and out of the tab order: the real
                button carries both. */}
      {reserveToggle && (
        <Button
          className="invisible"
          size="icon"
          tabIndex={-1}
          type="button"
          variant="ghost"
          aria-hidden
        >
          <LucideIcon.PanelRight strokeWidth={2} />
        </Button>
      )}
    </Inline>
  </header>
);
