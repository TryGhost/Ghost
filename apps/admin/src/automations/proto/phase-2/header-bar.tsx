import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { StatusBadge } from '@/automations/proto/shared/status-badge';

// PHASE 2 — the screen's header, docked: its own elevated surface with a rule under
// it. Two zones on one row: navigation and identity at the left — back arrow and
// title — and the screen's actions at the right.
//
// The right side is back to phase 1's per-state button pair (Save/Publish while
// off, Turn off/Publish changes while live). What stood here before was an on/off
// SWITCH — the state as readout and control in one, "Live" written into it — and
// the team's read was that it's the wrong pattern for a lifecycle: flipping a
// switch is how you change a setting, not how you take something live, and it
// made the change look saved the moment it flipped. Buttons name the act
// (Publish, Turn off), which is what an act this consequential wants. The switch
// experiment is in this file's history if it's ever worth re-reading.
//
// The buttons themselves live on the screen (see chromeActions in detail.tsx) —
// the header only places them, so a header style can't change what the screen
// lets you do. The LEFT side keeps everything the switch era added: the title
// opens details directly (pencil on hover), and there's no overflow menu —
// archiving belongs to the list, where the automation is a row among others
// rather than the thing you're inside.
//
// A centred "Automations / <name>" breadcrumb has now been tried here twice and
// rejected twice, on the same ground both times: it puts the automation's name at
// the middle of the screen while the control that leaves it sits at the edge, so
// the two halves of "where am I and how do I get out" end up apart. Centring does
// hold the title still while the pane opens and closes behind it — that's the one
// thing it's genuinely better at — but it isn't worth splitting identity from
// navigation, and a crumb that doubles as the way back still reads as a label
// first. If it comes up a third time, this is the objection to answer.
interface HeaderBarProps {
  title: string;
  // Rendered as a badge at the head of the right-side group — the readout
  // standing at the shoulder of the controls that change it. Phase 1 keeps it
  // on the left beside the title; over here it reads as the subject of the
  // buttons rather than part of the name, and the left side stays exactly the
  // title and the way back.
  status: 'active' | 'inactive';
  onBack: () => void;
  // The screen's chrome actions, passed as a node rather than rebuilt here so
  // both header variants raise identical controls — a header style shouldn't
  // change what the screen lets you do.
  actions: React.ReactNode;
  // Opens the automation's settings. Without it the title is plain text, which is
  // what the other lanes want — nothing there is editable from the header.
  onEditTitle?: () => void;
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
        {/* The badge leads the group: state first, then what you can do about
                    it. See the status prop for why it lives on this side. */}
        <StatusBadge status={status} />
        {actions}
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
