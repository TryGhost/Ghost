import { useId } from 'react';
import { canvasBackground } from './canvas-background';

export const HistoryBackground = () => {
  const patternId = useId();
  const { color, gap, size } = canvasBackground;
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <pattern height={gap} id={patternId} patternUnits="userSpaceOnUse" width={gap}>
          <circle cx={size / 2} cy={size / 2} fill={color} r={size / 2} />
        </pattern>
      </defs>
      <rect fill={`url(#${patternId})`} height="100%" width="100%" />
    </svg>
  );
};
