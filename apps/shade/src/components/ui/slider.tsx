import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

// Matches the thumb's `size-[18px]`. Radix keeps the thumb inside the track by
// nudging it inwards near the ends, so snaplines apply the same nudge to line
// up with the thumb's centre at each step.
const THUMB_SIZE_PX = 18;

// `aria-label`, `aria-labelledby` and `aria-valuetext` are moved from the root
// onto each thumb, because the thumb is the element with role="slider".
export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Draw a subtle line on the track at every step the thumb snaps to. */
  showSteps?: boolean;
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    {
      className,
      showSteps = false,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      orientation = 'horizontal',
      inverted = false,
      dir,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-valuetext': ariaValueText,
      ...props
    },
    ref,
  ) => {
    const thumbCount = (value ?? defaultValue ?? [min]).length;
    const isVertical = orientation === 'vertical';
    const isReversed = isVertical ? inverted : (dir === 'rtl') !== inverted;

    // Interior steps only: the track's own ends already mark min and max.
    const stepCount = max > min && step > 0 ? Math.floor((max - min) / step) : 0;
    const steps =
      showSteps && stepCount > 1 && stepCount <= 50
        ? Array.from({ length: stepCount - 1 }, (_, index) => min + (index + 1) * step)
        : [];

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          'relative flex touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
          isVertical ? 'h-full min-h-40 w-auto flex-col' : 'w-full',
          className,
        )}
        defaultValue={defaultValue}
        dir={dir}
        inverted={inverted}
        max={max}
        min={min}
        orientation={orientation}
        step={step}
        value={value}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            'relative grow overflow-hidden rounded-full bg-muted-foreground/12',
            isVertical ? 'h-full w-1.5' : 'h-1.5 w-full',
          )}
        >
          <SliderPrimitive.Range
            className={cn('absolute bg-primary', isVertical ? 'w-full' : 'h-full')}
          />
          {steps.map((stepValue) => {
            const percent = ((stepValue - min) / (max - min)) * 100;
            const fromStart = isReversed ? 100 - percent : percent;
            const offset = (THUMB_SIZE_PX / 2) * (1 - fromStart / 50);
            const position = `calc(${fromStart}% + ${offset}px)`;

            return (
              <span
                key={stepValue}
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute bg-muted-foreground/40',
                  isVertical ? 'inset-x-0 h-px translate-y-1/2' : 'inset-y-0 w-px -translate-x-1/2',
                )}
                style={isVertical ? { bottom: position } : { left: position }}
              />
            );
          })}
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-valuetext={ariaValueText}
            className="block size-[18px] rounded-full bg-background shadow-[var(--control-outline-shadow),var(--shadow-sm)] transition-shadow focus-visible:ring-2 focus-visible:ring-focus-ring/25 focus-visible:outline-hidden"
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
