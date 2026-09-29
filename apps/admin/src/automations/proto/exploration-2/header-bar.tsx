import React, { useState } from 'react';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// EXPLORATION 2 — the screen's header and its actions. The header holds the
// way back and the name, and closes up when the canvas is maximised; the
// actions live in the top-right cluster instead (see detail), which never
// moves.

// The top-right cluster's text buttons. 36px tall (h-9), the same as the icon
// buttons beside them — the sidebar toggle, the zoom controls, every HUD control
// — so the row is one height rather than 32px text buttons next to a 36px
// square. 13px, weight 500, and 14px either side (px-3.5), the post editor's
// header button type and padding.
export const HEADER_ACTION = 'h-9 px-3.5';

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
        {/* Publish, primary — the one thing to do with a stopped automation.
            Filled rather than ghost, from review: the header's actions read too
            quiet to find. (Which retires the editor-green text this used to
            borrow — the primary fill is the emphasis now.) Once it's on, this
            is Turn off, secondary beside Update. */}
        <Button
          className={HEADER_ACTION}
          type="button"
          variant={on ? 'secondary' : 'default'}
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

// The automation's actions, as the top-right cluster shows them. The primary
// always ends the row, so it sits in the same place whichever one it is:
//
//   Off:  Save  Publish
//   On:   Turn off  Update
//
// `commit` is the screen's Save / Update button: it owns the draft, so it's
// passed in rather than rebuilt here. Settings are a tab in the pane.
export const HeaderActions: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  commit: React.ReactNode;
  onStatusChange: (next: boolean) => void;
}> = ({ status, canGoLive, commit, onStatusChange }) => {
  const statusAction = (
    <StatusAction canGoLive={canGoLive} status={status} onChange={onStatusChange} />
  );
  return status === 'active' ? (
    <>
      {statusAction}
      {commit}
    </>
  ) : (
    <>
      {commit}
      {statusAction}
    </>
  );
};

// Just identity now: the way back and the name. The actions moved out to the
// screen's top-right cluster (see detail), which holds its place whether the
// pane is open or not — the header is the part that comes and goes.
interface HeaderBarProps {
  title: string;
  onBack: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, onBack }) => (
  <header
    className={cn(
      // 24px on every side, the way the post editor's header does it, rather than a
      // fixed height with only horizontal padding: the row is as tall as the tallest
      // control in it plus its margins, so changing a control's size changes the
      // header instead of leaving it centred in a number that no longer means
      // anything. The 24px is also the column the rail and the canvas controls use,
      // so every leading control on the screen starts on one line.
      'relative z-30 flex shrink-0 items-center justify-between p-6',
      // No surface or rule of its own: the canvas below is an inset window, and
      // the header sits on the page around it, the same ground as the pane.
      'bg-background',
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
  </header>
);
