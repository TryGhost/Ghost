import { useCallback, useState } from 'react';
import type { NodeChange } from '@xyflow/react';

// Visible space between one card and the next. The shared canvas's 112 was
// sized for 400px cards carrying whole forms; light nodes want the flow to read
// as one short column, closer to Loops' spacing — enough for the + to sit on
// the connector with air either side.
export const STEP_GAP = 64;
const UNMEASURED_NODE_HEIGHT = 80;

// The shared useMeasuredColumn (flow-utils), with this lane's gap. Copied rather
// than parameterised there so the shared file — and every other lane — stays
// exactly as it is. Its own file so the edit and run canvases share one column
// (a hook exported from a component file breaks fast refresh).
export const useMeasuredColumn = () => {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setHeights((current) => {
      let next = current;
      for (const change of changes) {
        if (change.type !== 'dimensions' || !change.dimensions) {
          continue;
        }
        const height = Math.round(change.dimensions.height);
        if (!height || current[change.id] === height) {
          continue;
        }
        if (next === current) {
          next = { ...current };
        }
        next[change.id] = height;
      }
      return next;
    });
  }, []);
  const layout = useCallback(
    (ids: string[]) => {
      const measured = ids.map((id) => heights[id] ?? UNMEASURED_NODE_HEIGHT);
      let cursor = 0;
      const ys = measured.map((height) => {
        const y = cursor;
        cursor += height + STEP_GAP;
        return y;
      });
      const bottom = measured.length ? ys[ys.length - 1] + measured[measured.length - 1] : 0;
      return { ys, bottom };
    },
    [heights],
  );
  return { onNodesChange, layout };
};
