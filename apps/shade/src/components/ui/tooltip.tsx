import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';
import { SHADE_APP_NAMESPACES } from '@/shade-app';

const TooltipInputContext = React.createContext<React.RefObject<boolean> | null>(null);

/**
 * Shared hover timing: `delayDuration` (ms) waits before the first tooltip;
 * `skipDelayDuration` (ms) lets nearby triggers open immediately after it.
 * Individual Tooltip roots can override delayDuration. Keyboard focus opens immediately.
 */
function TooltipProvider({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  const pointerInteraction = React.useRef(false);

  React.useEffect(() => {
    const onPointerDown = () => {
      pointerInteraction.current = true;
    };
    const onKeyDown = () => {
      pointerInteraction.current = false;
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return (
    <TooltipInputContext.Provider value={pointerInteraction}>
      <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>
    </TooltipInputContext.Provider>
  );
}

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onFocus, ...props }, ref) => {
  const pointerInteraction = React.useContext(TooltipInputContext);

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      {...props}
      onFocus={(event) => {
        onFocus?.(event);
        // Menus restore focus after selection. Pointer-driven restoration should
        // not reveal a tooltip; keyboard focus and normal hover still should.
        if (pointerInteraction?.current) {
          event.preventDefault();
        }
      }}
    />
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const tooltipContentVariants = cva(
  'z-50 animate-in overflow-hidden rounded-menu px-3 py-1.5 text-xs fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground dark:bg-popover dark:text-popover-foreground',
        white: 'bg-surface-elevated-2 text-foreground shadow-md',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface TooltipContentProps
  extends
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, variant, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <div className={SHADE_APP_NAMESPACES}>
      <TooltipPrimitive.Content
        ref={ref}
        className={cn(tooltipContentVariants({ variant }), className)}
        sideOffset={sideOffset}
        {...props}
      />
    </div>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
