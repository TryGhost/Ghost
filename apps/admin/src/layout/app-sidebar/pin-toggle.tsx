import React from 'react';
import { FLOATING_SIDEBAR_SPRING } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';

interface PinToggleProps extends Omit<React.ComponentProps<'button'>, 'onChange'> {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  /** Read out while unpinned, e.g. "Pin Calendar to the sidebar". */
  pinLabel: string;
  /** Read out while pinned. */
  unpinLabel: string;
}

/**
 * A round icon button that pins or unpins an item in the sidebar, styled and
 * moving like the floating sidebar's own pin: the pin tilts 45° when pinned.
 * Position and visibility are the consumer's, through `className`. With
 * `aria-disabled` it stays focusable but doesn't toggle, so a tooltip can say
 * why.
 */
const PinToggle = React.forwardRef<HTMLButtonElement, PinToggleProps>(
  ({ pinned, onPinnedChange, pinLabel, unpinLabel, className, onClick, ...props }, ref) => (
    <button
      // First, so a wrapping trigger (a tooltip's, say) can't replace the
      // toggle's own state or label
      {...props}
      ref={ref}
      aria-label={pinned ? unpinLabel : pinLabel}
      className={cn(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[opacity,color,background-color] duration-200 hover:bg-interactive-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground',
        className,
      )}
      data-state={pinned ? 'pinned' : 'unpinned'}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        const ariaDisabled = props['aria-disabled'];
        if (!event.defaultPrevented && ariaDisabled !== true && ariaDisabled !== 'true') {
          onPinnedChange(!pinned);
        }
      }}
    >
      <LucideIcon.Pin
        aria-hidden="true"
        className="size-4 transition-transform duration-300 motion-reduce:transition-none"
        strokeWidth={1.75}
        style={{
          transform: pinned ? 'rotate(45deg)' : 'rotate(0deg)',
          transitionTimingFunction: FLOATING_SIDEBAR_SPRING,
        }}
      />
    </button>
  ),
);
PinToggle.displayName = 'PinToggle';

export { PinToggle };
