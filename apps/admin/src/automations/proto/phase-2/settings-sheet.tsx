import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Label, Textarea } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// The automation's settings, as a right-side sheet — the settings AREA the
// details editing grew into (head-of-UX ask), raised from a persistent gear in
// the header.
//
// The editor has now worn four containers: a dialog with Save (two commit
// vocabularies), the same dialog with Done and then a lone Close (both still
// read as finishing a form), and a popover under the title (no form-frame, but
// no room to become a settings area either). The sheet is where the thread
// resolves: PANEL grammar — you open it, change things, put it away — with
// space for every per-automation setting that lands later. There is no commit
// control in here at all, and that's the point: fields write through to the
// screen's draft, the header retitles live beside this sheet as you type, and
// the header's global Save stays the only commit on the screen.
//
// Deliberately NOT Shade's modal Sheet, and not a modal anything: this matches
// the email analytics sheet (see canvas/email-analytics-sheet) — an absolutely
// positioned aside sliding over the canvas, screen live behind it, Esc or an
// outside press to dismiss. A modal overlay would dim the header this sheet's
// own edits are retitling. (A top-right ✕ on a MODAL is also not a Ghost
// desktop pattern — SettingsModal shows one on mobile only — but a close in a
// PANEL's corner is exactly what both this screen's other sheet and Shade's
// own Sheet do.)

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  // Whether the CURRENT field text collides with another automation's name,
  // computed live by the screen (see isNameTaken). The collision guard itself
  // is the screen's — a colliding name never reaches the draft — so this only
  // drives what the field says about it.
  nameTaken: boolean;
}

// How long a collision has to hold still before the field says so. Extending
// an existing name passes THROUGH a collision — typing "Welcome series 2" is
// momentarily "Welcome series" — and an error that fires on that keystroke
// scolds people mid-thought. The guard upstream is keystroke-level either way;
// only the message waits.
const ERROR_DEBOUNCE_MS = 450;

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  open,
  onOpenChange,
  values,
  onChange,
  nameTaken,
}) => {
  const sheetRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus the name once open — with preventScroll, and that's load-bearing: a
  // bare autoFocus fires while the sheet is still sliding in from off-screen
  // inside the row's overflow-hidden container, and the browser scrolls that
  // container to reveal the focused field — shunting the pane and canvas
  // sideways, which read as the pane collapsing and reopening. Same trap the
  // canvas's new-step focus documents; same fix.
  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      nameRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!nameTaken) {
      setShowError(false);
      return;
    }
    const timer = setTimeout(() => setShowError(true), ERROR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // values.name is a dependency so the timer restarts on every keystroke —
    // the message appears only once a colliding value has been LEFT there.
  }, [nameTaken, values.name]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    // Capture-phase pointerdown, exactly as the analytics sheet does and for
    // the same two reasons: React Flow's pane handler stopImmediatePropagation()s
    // bubble-phase clicks on the canvas (most of "outside"), and the click that
    // opened the sheet is still propagating when this listener attaches.
    const onPointerDown = (event: PointerEvent) => {
      // The header's gear manages this sheet itself — its press toggles, and
      // closing here on its pointerdown would make the toggle's own click
      // re-open what it just closed.
      const target = event.target as Element | null;
      if (target?.closest?.('[data-settings-toggle]')) {
        return;
      }
      if (!sheetRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, onOpenChange]);

  return (
    <aside
      ref={sheetRef}
      aria-hidden={!open}
      aria-label="Automation settings"
      className={cn(
        // Same chrome and motion as the analytics sheet — the screen's two
        // sheets should read as one kind of surface. z-50 for the same reason
        // it needs it: later chrome would otherwise paint over the close.
        'absolute inset-y-0 right-0 z-50 flex w-[calc(100%-6rem)] max-w-none translate-x-full flex-col overflow-y-auto border-l border-border-default bg-surface-elevated shadow-sm transition-transform duration-200 ease-out sm:w-[400px]',
        open ? 'translate-x-0' : 'pointer-events-none',
      )}
      data-state={open ? 'open' : 'closed'}
      data-testid="automation-settings-sheet"
    >
      {open && (
        <>
          {/* Sticky, like the analytics sheet's header: the close stays
                        reachable however long the settings list below grows. */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-elevated py-3 pr-3 pl-6">
            <Text as="h3" className="text-lg" weight="semibold">
              Settings
            </Text>
            <Button
              aria-label="Close settings"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <LucideIcon.X strokeWidth={2} />
            </Button>
          </div>
          <div className="flex flex-col gap-5 px-6 pb-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input
                ref={nameRef}
                aria-invalid={showError || undefined}
                id="automation-name"
                value={values.name}
                onChange={(e) => onChange({ ...values, name: e.target.value })}
              />
              {/* Present only while true — the row appearing is itself part of
                            the signal. aria-live so the arrival is announced without
                            moving focus off the field being corrected. */}
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
          </div>
        </>
      )}
    </aside>
  );
};
