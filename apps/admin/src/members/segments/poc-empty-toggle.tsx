import { Label, Switch } from '@tryghost/shade/components';
import { useId } from 'react';
import { useSimulateNoSegments } from './poc-store';

/**
 * POC (poc/segments-ui) only: a switch in the bottom-left corner of the screen that makes the
 * site look as if it had no segments, so the empty states can be seen without deleting any.
 * Nothing is deleted. The segments come back when it is switched off.
 */
export function PocEmptySegmentsToggle() {
  const id = useId();
  const { simulateNoSegments, setSimulateNoSegments } = useSimulateNoSegments();

  return (
    <div
      className="absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm"
      data-testid="poc-empty-segments-toggle"
    >
      <Switch checked={simulateNoSegments} id={id} onCheckedChange={setSimulateNoSegments} />
      <Label className="text-xs font-normal text-muted-foreground" htmlFor={id}>
        Prototype: pretend there are no segments
      </Label>
    </div>
  );
}
