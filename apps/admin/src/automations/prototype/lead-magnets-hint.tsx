// PROTOTYPE ONLY (NY-1750): the hint under the member page's Labels field, when the prototype
// menu picks hints: the banner's words in the bulk hint's muted line, with the zap and the names in
// medium weight. Removals say nothing (Peter, 2026-11-17). Don't merge this folder.
import type { LeadMagnetLabelChanges } from './lead-magnets';
import { useHintStyle } from './settings';
import { LeadMagnetSaveSummary } from './lead-magnets-summary';
import { LeadMagnetHintLine } from './lead-magnets-bulk-note';

export const LeadMagnetLabelsHint: React.FC<{
  changes: LeadMagnetLabelChanges;
  // Label slug → name.
  labelNames: Record<string, string>;
}> = ({ changes, labelNames }) => {
  const style = useHintStyle();
  if (style !== 'hint' || changes.starts.length === 0) {
    return null;
  }
  return (
    <LeadMagnetHintLine>
      <LeadMagnetSaveSummary
        emphasis="medium"
        ends={[]}
        labelNames={labelNames}
        starts={changes.starts}
      />
    </LeadMagnetHintLine>
  );
};
