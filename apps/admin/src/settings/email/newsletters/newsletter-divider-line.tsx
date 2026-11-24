import React from 'react';
import type { DividerStyle } from './newsletter-divider';
import { cn } from '@tryghost/shade/utils';

/** Today's divider colour, used when the newsletter's divider colour is left on Auto. */
const DEFAULT_DIVIDER_COLOR = '#e0e7eb';

const DOT_SIZE_PX = 4;
const DOT_GAP_PX = 10;
const SHORT_LINE = { width: 48, thickness: 3 };

/**
 * Draws one divider across its container in the given style. `color` defaults to today's
 * divider grey; pass `currentColor` to draw it in the surrounding text colour.
 */
export const DividerLine: React.FC<{
  className?: string;
  color?: string;
  dividerStyle: DividerStyle;
  style?: React.CSSProperties;
}> = ({ className, color = DEFAULT_DIVIDER_COLOR, dividerStyle, style }) => {
  if (dividerStyle === 'dots') {
    return (
      <div
        aria-hidden="true"
        className={cn('flex justify-center', className)}
        style={{ gap: DOT_GAP_PX, ...style }}
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="shrink-0 rounded-full"
            style={{ backgroundColor: color, height: DOT_SIZE_PX, width: DOT_SIZE_PX }}
          />
        ))}
      </div>
    );
  }

  if (dividerStyle === 'short') {
    return (
      <div aria-hidden="true" className={cn('flex justify-center', className)} style={style}>
        <span
          className="rounded-full"
          style={{
            backgroundColor: color,
            height: SHORT_LINE.thickness,
            width: SHORT_LINE.width,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        borderTop: `1px solid ${color}`,
        ...style,
      }}
    />
  );
};
