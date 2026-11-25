import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { Button, Label, Switch } from '@tryghost/shade/components';
import { useId, useState } from 'react';
import { useSimulateNoSegments } from './poc-store';
import { SegmentBuilderDialog } from './segment-builder';

/**
 * POC (poc/segments-ui) only: controls in the bottom-left corner of the members screen.
 *
 * - A switch that makes the site look as if it had no segments, so the empty states can be seen
 *   without deleting any. Nothing is deleted. The segments come back when it is switched off.
 * - A button that opens the segment builder, the component other screens would create a segment
 *   with, such as an automation's trigger. The members screen itself doesn't use it.
 */
export function PocControls({
  onSegmentCreated,
}: {
  onSegmentCreated?: (segment: Segment) => void;
}) {
  const id = useId();
  const { simulateNoSegments, setSimulateNoSegments } = useSimulateNoSegments();
  const [builderOpen, setBuilderOpen] = useState(false);

  return (
    <>
      <div
        className="absolute bottom-4 left-4 z-40 flex items-center gap-3 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-3 shadow-sm"
        data-testid="poc-controls"
      >
        <span className="text-xs font-medium text-muted-foreground">Prototype</span>
        <span className="flex items-center gap-2">
          <Switch checked={simulateNoSegments} id={id} onCheckedChange={setSimulateNoSegments} />
          <Label className="text-xs font-normal text-muted-foreground" htmlFor={id}>
            No segments
          </Label>
        </span>
        <Button size="sm" variant="outline" onClick={() => setBuilderOpen(true)}>
          Segment builder
        </Button>
      </div>
      {builderOpen && (
        <SegmentBuilderDialog
          open
          withPin
          onCreated={onSegmentCreated}
          onOpenChange={setBuilderOpen}
        />
      )}
    </>
  );
}
