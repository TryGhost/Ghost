import React, { useState } from 'react';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@tryghost/shade/components';
import { HEADER_ACTION, floatingControl } from './header-controls';
import { cn } from '@tryghost/shade/utils';

// EXPLORATION 2 — the automation's lifecycle buttons. There's no header bar:
// the canvas fills the screen and these float over it, top-right (see detail).

const StatusAction: React.FC<{
  status: 'active' | 'inactive';
  canGoLive: boolean;
  onChange: (next: boolean) => void;
  floating: boolean;
}> = ({ status, canGoLive, onChange, floating }) => {
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
            is Turn off, a ghost button beside Update: only the primary is
            filled, so the one press that matters is the one that stands out. */}
        <Button
          className={cn(HEADER_ACTION, floatingControl(floating, !on))}
          type="button"
          variant={on ? 'ghost' : 'default'}
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
  floating: boolean;
}> = ({ status, canGoLive, commit, onStatusChange, floating }) => {
  const statusAction = (
    <StatusAction
      canGoLive={canGoLive}
      floating={floating}
      status={status}
      onChange={onStatusChange}
    />
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
