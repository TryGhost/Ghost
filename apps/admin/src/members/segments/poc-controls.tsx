import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { ShadeScope } from '@tryghost/shade/app';
import { Button, Label, Switch } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrototypeSeed } from './poc-seed';
import { useBuilderFilterFirst, useSegmentUsage, useSimulateNoSegments } from './poc-store';
import { SegmentBuilderDialog, SegmentBuilderPopover } from './segment-builder';
import { useSegmentSuggestions } from './segment-suggestions';

/**
 * POC (poc/segments-ui) only: controls at the bottom of the window while the members screen is
 * open. They are fixed to the window, since the members screen scrolls as a whole.
 *
 * - A switch for the segment builder's order: on, the filters first and the name once they
 *   match someone, which is the default; off, the name first, so the two can be compared.
 * - Clear and Seed: Clear deletes every segment, for real, and resets the prototype's own state
 *   (the sidebar fold, pretend usage, the automation mock). Seed puts back the segments the
 *   prototype is shown with. For filming from nothing, and coming back after.
 * - A switch that makes the site look as if it had no segments, so the empty states can be seen
 *   without deleting any. Nothing is deleted. The segments come back when it is switched off.
 * - While a segment is open, a switch that pretends something uses it, so the dialogs that say
 *   so can be seen: a scheduled post and an automation.
 * - Buttons that open the segment builder, the component other screens would create a segment
 *   with, such as an automation's trigger: as a dialog, and as a popover hung from the button.
 *   The members screen itself doesn't use it.
 */
export function PocControls({
  onSegmentCreated,
  openSegmentId,
}: {
  onSegmentCreated?: (segment: Segment) => void;
  /** The segment the members screen is showing, if any. */
  openSegmentId?: string;
}) {
  const id = useId();
  const filterFirstId = useId();
  const inUseId = useId();
  const { isSimulated, setSimulated } = useSegmentUsage();
  const { filterFirst, setFilterFirst } = useBuilderFilterFirst();
  const prototypeSeed = usePrototypeSeed();
  const suggestions = useSegmentSuggestions();
  const { simulateNoSegments, setSimulateNoSegments } = useSimulateNoSegments();
  // The segment builder, in either of its two shells.
  const [builder, setBuilder] = useState<'dialog' | 'popover' | null>(null);
  const popoverButton = useRef<HTMLButtonElement>(null);
  const closeBuilder = (open: boolean) => {
    if (!open) {
      setBuilder(null);
    }
  };

  return (
    <>
      {/* In the document body, so nothing the page does to its own layout hides them. The
          scope carries Shade's styles there. */}
      {createPortal(
        // The scope fills its parent by default, which here would lie over the whole page.
        <ShadeScope style={{ width: 'unset', height: 'unset' }}>
          <div
            className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-3 shadow-md"
            data-testid="poc-controls"
          >
            <span className="text-xs font-medium text-muted-foreground">Prototype</span>
            <Inline as="span" gap="sm">
              <Switch
                checked={simulateNoSegments}
                id={id}
                onCheckedChange={setSimulateNoSegments}
              />
              <Label className="text-xs font-normal text-muted-foreground" htmlFor={id}>
                No segments
              </Label>
            </Inline>
            {openSegmentId && (
              <Inline as="span" gap="sm">
                <Switch
                  checked={isSimulated(openSegmentId)}
                  id={inUseId}
                  onCheckedChange={(checked) => setSimulated(openSegmentId, checked)}
                />
                <Label className="text-xs font-normal text-muted-foreground" htmlFor={inUseId}>
                  In use
                </Label>
              </Inline>
            )}
            <Inline as="span" gap="sm">
              <Switch checked={filterFirst} id={filterFirstId} onCheckedChange={setFilterFirst} />
              <Label className="text-xs font-normal text-muted-foreground" htmlFor={filterFirstId}>
                Filter first
              </Label>
            </Inline>
            <Button
              disabled={Boolean(prototypeSeed.working) || prototypeSeed.count === 0}
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm(`Delete all ${prototypeSeed.count} segments?`)) {
                  void prototypeSeed.clear();
                }
              }}
            >
              {prototypeSeed.working === 'clearing' ? 'Clearing…' : 'Clear'}
            </Button>
            <Button
              disabled={Boolean(prototypeSeed.working)}
              size="sm"
              variant="outline"
              onClick={() => void prototypeSeed.seed()}
            >
              {prototypeSeed.working === 'seeding' ? 'Seeding…' : 'Seed'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBuilder('dialog')}>
              Builder dialog
            </Button>
            <Button
              ref={popoverButton}
              size="sm"
              variant="outline"
              onClick={() => setBuilder('popover')}
            >
              Builder popover
            </Button>
          </div>
        </ShadeScope>,
        document.body,
      )}
      {builder === 'dialog' && (
        <SegmentBuilderDialog
          suggestions={suggestions}
          open
          onCreated={onSegmentCreated}
          onOpenChange={closeBuilder}
        />
      )}
      <SegmentBuilderPopover
        anchorRef={popoverButton}
        open={builder === 'popover'}
        suggestions={suggestions}
        onCreated={onSegmentCreated}
        onOpenChange={closeBuilder}
      />
    </>
  );
}
