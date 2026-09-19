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

// PHASE 2 — the screen's header, docked: its own elevated surface with a rule under
// it. Two zones on one row: navigation and identity at the left — back arrow and
// title — and the screen's actions at the right, ending in the on/off switch.
//
// The switch came from Exploration, along with the shape of the row. What it replaced
// was a status BADGE beside the title plus Publish and Turn off buttons on the right:
// three places saying one thing, none of which was the control. The switch is the
// readout and the control at once, and it confirms itself — flipping it is visible
// where you pressed it, so the lifecycle no longer depends on a toast to say what
// happened. It's also closer to what the post editor does, which is the shape this
// lane is meant to end up in.
//
// Phase 1 still has the original header, so the badge-and-buttons version is one lane
// away if this doesn't hold up.
//
// No overflow menu. It held Edit details and Archive; the title opens details
// directly now, and archiving belongs to the list, where the automation is a row
// among others rather than the thing you're inside.
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
const StatusSwitch: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  onChange: (next: boolean) => void;
  // A blocked turn-on, reported upward alongside the popover: pressing the
  // switch is asking "can this run?", and the screen uses the moment to make
  // the canvas show every warning it holds — grace periods included.
  onBlockedAttempt?: () => void;
}> = ({ status, canGoLive, onChange, onBlockedAttempt }) => {
  const on = status === 'active';
  // The switch is NEVER disabled. It used to grey out while the automation
  // couldn't go live, and a disabled control is a dead end — it says no without
  // saying why, and the why was a warning sitting somewhere else on the screen.
  // Pressing it while blocked answers at the point of the press instead: a
  // popover naming the deal — fix the issues, then this works. Turning OFF is
  // never blocked; a running automation can always be stopped.
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
              onBlockedAttempt?.();
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
      {/* Same voice and dress as the card warnings' popovers (w-72, one text-md
                sentence): this is the same kind of answer, raised from a control
                instead of a card. */}
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
  // Opens the automation's settings. Without it the title is plain text, which is
  // what the other lanes want — nothing there is editable from the header.
  onEditTitle?: () => void;
  // Asks for the status to change. The screen decides what that costs — both
  // directions confirm first — so the switch renders `status` and never its own
  // guess: one that flips before the answer is one that can be wrong.
  onStatusChange: (next: boolean) => void;
  // Nothing to turn on yet — no trigger, no Stripe, or a blank email.
  canGoLive: boolean;
  // Fired when the switch is pressed while blocked — see StatusSwitch.
  onBlockedGoLive?: () => void;
  /**
   * A transient message about the automation as a whole. Currently unused: the
   * Stripe warning that lived here moved onto the trigger card (see triggerWarning
   * on the edit canvas), which is where the cause of the problem lives.
   *
   * The slot stays while that treatment is being evaluated. The objection that
   * put the message here in the first place — the canvas moves — was about a
   * banner FLOATING over the flow, colliding with whatever panned under it; a
   * warning anchored to the card travels with the card, which is a different
   * thing. If the card treatment sticks, delete this slot and both render sites.
   *
   * Passed as a node for the same reason `actions` is: the header owns where it
   * goes, the screen owns what it says.
   */
  notice?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  status,
  onBack,
  actions,
  onEditTitle,
  onStatusChange,
  canGoLive,
  onBlockedGoLive,
  notice,
}) => (
  // A column, not a row: the bar is one 64px row wide enough for the notice to
  // sit in, and two rows when it isn't. shrink-0 without a fixed height, so it
  // grows and everything below moves down rather than being covered.
  <header
    // group/header: the pencil beside the title reveals on hover over the WHOLE
    // bar, not just the title — see the note on the title button.
    className={cn(
      'group/header relative z-30 flex shrink-0 flex-col',
      'border-b border-border-default bg-surface-elevated',
    )}
  >
    <div className="relative flex h-16 items-center justify-between px-6">
      {/* From lg (1024px — Shade sets breakpoints in px, so this is a real 1024
                    despite the 62.5% root) the notice is centred across the whole bar, so
                    it sits on the screen's centre line regardless of how long the title is
                    or how many actions there are. Overlaid rather than in flow for the
                    same reason — a third flex child would push identity and actions around
                    as it appears and disappears.

                    pointer-events-none on the overlay so the half of the header it covers
                    stays clickable; the message itself has nothing to click. */}
      {notice && (
        <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center px-6 lg:flex">
          <div className="pointer-events-auto max-w-lg">{notice}</div>
        </div>
      )}

      {/* Identity sits with navigation at the left rather than centred: the title
            is what you came here for, and the way back belongs beside it. min-w-0 so
            a long automation name truncates instead of pushing the actions off. */}
      <Inline align="center" className="min-w-0" gap="sm">
        {/* No negative inset. It used to pull back 8px so the arrow's 16px GLYPH
                landed optically on the 24px column rather than its box — which is a real
                argument, and it lost to a simpler one: the box then starts at 16, and the
                header's right-hand actions start at 24, so the two ends of the same row
                disagreed by 8px. The right side has no glyph to inset and can't be moved
                without breaking the column the pane below it shares.

                So every leading edge on this screen is a box edge on 24: the back arrow,
                the pane toggle in both its states, and the pane's own content. Optical
                alignment of one glyph isn't worth a header that's visibly off-centre. */}
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
                the hierarchy — the region label outranking the thing it reports on.

                Editable, it becomes a button carrying a pencil — a hover fill, a
                pointer, and a glyph that says so.

                The pencil has now been through three rounds. Faded in on TITLE hover
                (cut: an invisible affordance still reserving its width pays rent
                twice); always visible (worked, but a permanent glyph beside the
                screen's subject was chrome the title carried everywhere); and now
                revealed on hover over the whole HEADER — a target the size of the
                bar, so it's on screen the moment the cursor is anywhere near the
                thing it labels, while the title reads clean in a screenshot or at
                rest. The width stays reserved either way, so nothing shifts.
                Keyboard focus on the button also reveals it — an affordance that
                only mouse users can discover isn't one.

                Muted, and it doesn't brighten on hover — the title is the target and
                the pencil is a label for it, not a second thing to aim at.

                px-2 so the hover fill has room, and -ml-2 to take that padding back out
                of the layout — otherwise turning the title into a button would shift the
                text 8px right of where it sits when it isn't one. This inset cancels its
                own padding; it isn't the column inset the back arrow just lost.

                h-9 rather than py-1, which sized the fill to the TEXT and came out at
                ~28px — visibly shorter than the 36px back arrow standing next to it, so
                two controls on one line had two different hover targets. Shade's
                size="icon" is 36, and matching the number directly is more honest than
                arriving at it through padding that would drift the moment the title's
                type scale moved. */}
        {onEditTitle ? (
          <button
            className="group/title -ml-2 flex h-9 min-w-0 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden"
            title="Edit details"
            type="button"
            onClick={onEditTitle}
          >
            <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
            <LucideIcon.Pen
              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-visible/title:opacity-100 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </button>
        ) : (
          <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
        )}
      </Inline>

      <Inline align="center" className="shrink-0" gap="sm">
        {actions}
        {/* A rule, not a border. The status isn't another action — it's what the
                    actions are acting on — so it's set apart rather than lined up with
                    them. h-5 rather than full height: a hairline the height of the row
                    would divide the header, where this only divides the group. */}
        <Separator className="h-5" orientation="vertical" />
        {/* Ends the row. It's the only control here that changes what the automation
                    DOES rather than what you're looking at, so it gets the far edge. */}
        <StatusSwitch
          canGoLive={canGoLive}
          status={status}
          onBlockedAttempt={onBlockedGoLive}
          onChange={onStatusChange}
        />
      </Inline>
    </div>

    {/* Below lg the notice gets its own row and the header grows to hold it.
                Centring it in the first row only works while there's room either side
                of the title and the actions; once there isn't, it either overlaps them
                or squeezes to nothing. A second row keeps it readable at full width and
                pushes the screen down rather than covering anything.

                Rendered twice — once here, once overlaid above — rather than one
                element carrying a dozen responsive overrides. Each is display:none at
                the other size, so only one is ever in the accessibility tree and the
                alert announces once. */}
    {notice && <div className="px-6 pb-3 lg:hidden">{notice}</div>}
  </header>
);
