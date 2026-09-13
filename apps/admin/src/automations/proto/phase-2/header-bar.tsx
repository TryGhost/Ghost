import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { StatusBadge } from '@/automations/proto/shared/status-badge';

// PHASE 2 — the screen's header, docked: its own elevated surface with a rule
// under it. Two zones on one row: navigation and identity at the left — back
// arrow, then the title and its status — and the screen's actions at the right.
// The arrangement is shared with the other lanes; only the surface differs.
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
   * A transient message about the automation as a whole — today, that it can't be
   * published without Stripe.
   *
   * Passed as a node for the same reason `actions` is: the header owns where it
   * goes, the screen owns what it says.
   *
   * It lives here rather than on the canvas because the canvas moves. Floating it
   * over the flow put it on a surface that pans and zooms underneath it, so it
   * collided with whichever card happened to scroll under it. The header is the
   * one part of this screen that holds still — and it's where Publish is, which
   * is the thing the message is about.
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
                the hierarchy — the region label outranking the thing it reports on.

                Editable, it becomes a button — a hover fill and a pointer, and
                nothing else. It carried a pencil that faded in on hover, which
                reserved its width at rest and left a gap between the name and its
                status badge that nothing occupied. An affordance that is invisible
                but still takes up space is paying rent twice: it doesn't advertise
                anything, and it pushes the header apart while not advertising it.

                Discovery isn't this control's job anyway — the ⋯'s Settings row
                does that, and one findable route is enough. This is the shortcut
                for people who guess that a title is clickable, which most do.

                -ml-2 with px-2 so the hover fill has room without the text
                shifting off the line the back arrow's glyph sets. */}
        {onEditTitle ? (
          <button
            className="-ml-2 flex min-w-0 rounded-md px-2 py-1 transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden"
            title="Automation settings"
            type="button"
            onClick={onEditTitle}
          >
            <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
          </button>
        ) : (
          <span className="min-w-0 truncate text-lg font-semibold">{title}</span>
        )}
        <StatusBadge status={status} />
      </Inline>

      <Inline align="center" className="shrink-0" gap="sm">
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
