import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { StatusBadge } from '@/automations/proto/shared/status-badge';
import { PROTO_EASE } from '@/automations/proto/shared/motion';

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
// lets you do. There's no overflow menu — archiving belongs to the list, where
// the automation is a row among others rather than the thing you're inside.
//
// The title is PLAIN TEXT with a persistent gear beside it. It's been a button
// wearing a hover pencil (opening a dialog, then a popover from the title
// itself) — retired with the settings sheet: a hidden affordance was the
// standing complaint, and with a visible gear owning "open settings", a second
// clickable thing doing the same job would be two controls for one act. The
// gear is muted, always there, and sized like every icon control on this row.
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
  // Rendered as a badge beside the title, as in phase 1. It spent a while at
  // the head of the right-side group, reading as the subject of the buttons;
  // it came back when the panel toggle joined that group.
  status: 'active' | 'inactive';
  onBack: () => void;
  // The screen's chrome actions, passed as a node rather than rebuilt here so
  // both header variants raise identical controls — a header style shouldn't
  // change what the screen lets you do.
  actions: React.ReactNode;
  // Whether the side panel is open. The panel's toggle isn't in this header —
  // it's pinned to the screen's top-right corner (see the detail screen) — but
  // while the panel is closed it sits over this header's right end, so the
  // header reserves its footprint then, and gives it up as the panel opens.
  paneOpen: boolean;
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
  paneOpen,
  notice,
}) => (
  // A column, not a row: the bar is one 64px row wide enough for the notice to
  // sit in, and two rows when it isn't. shrink-0 without a fixed height, so it
  // grows and everything below moves down rather than being covered.
  <header
    className={cn(
      'relative z-30 flex shrink-0 flex-col',
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

                Plain text — renaming lives in the side panel's Settings tab,
                not the title. The title-as-button era (hover pencil, dialog, then
                a popover hung from it) is in this file's history; it ended when
                the head of UX asked for a real settings area and the hidden
                affordance was the standing complaint. */}
        <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
        {/* The status beside the name it describes. It sat at the head of the
            actions for a while — state, then what to do about it — but with the
            panel toggle joining that group the right side grew busy, and a
            status reads as part of the automation's identity. shrink-0 so a long
            name truncates before the badge does. */}
        <span className="flex shrink-0">
          <StatusBadge status={status} />
        </span>
      </Inline>

      <Inline align="center" className="shrink-0" gap="sm">
        {actions}
        {/* The pinned toggle's footprint: its 32px plus the row's 8px gap
            (the gap this Inline already adds, so w-8). Open, the toggle
            is over the panel instead, so this closes to nothing — on the
            panel's own width curve, so the actions glide rather than jumping
            40px when the press lands. */}
        <span
          className={cn(
            `shrink-0 transition-[width,margin] duration-300 ${PROTO_EASE} motion-reduce:transition-none`,
            paneOpen ? '-ml-2 w-0' : 'w-8',
          )}
          aria-hidden
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
