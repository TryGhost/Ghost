import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';
import { ShadeScope } from '@/shade-scope';

const TooltipInputContext = React.createContext<React.RefObject<{
  suppressFocus: boolean;
  windowBlurred: boolean;
}> | null>(null);

/**
 * Shared hover timing: `delayDuration` (ms) waits before the first tooltip;
 * `skipDelayDuration` (ms) lets nearby triggers open immediately after it.
 * Individual Tooltip roots can override delayDuration. Keyboard focus opens immediately.
 */
function TooltipProvider({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  const inputState = React.useRef({ suppressFocus: false, windowBlurred: false });

  React.useEffect(() => {
    const suppressFocus = () => {
      inputState.current.suppressFocus = true;
    };
    const onWindowBlur = () => {
      suppressFocus();
      inputState.current.windowBlurred = true;
    };
    const onKeyDown = () => {
      inputState.current.suppressFocus = false;
      inputState.current.windowBlurred = false;
    };
    const onPointerMove = () => {
      inputState.current.windowBlurred = false;
    };
    document.addEventListener('pointerdown', suppressFocus, true);
    document.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', suppressFocus, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return (
    <TooltipInputContext.Provider value={inputState}>
      <TooltipPrimitive.Provider delayDuration={1000} {...props}>
        {children}
      </TooltipPrimitive.Provider>
    </TooltipInputContext.Provider>
  );
}

function Tooltip({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const inputState = React.useContext(TooltipInputContext);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      // Radix may finish a hover timer after window blur. Wait for fresh input.
      if (nextOpen && inputState?.current?.windowBlurred) {
        return;
      }
      setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [inputState, onOpenChange],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => handleOpenChange(false);
    window.addEventListener('blur', close);
    return () => window.removeEventListener('blur', close);
  }, [open, handleOpenChange]);

  return (
    <TooltipPrimitive.Root
      {...props}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={handleOpenChange}
    />
  );
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onFocus, ...props }, ref) => {
  const inputState = React.useContext(TooltipInputContext);

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      {...props}
      onFocus={(event) => {
        onFocus?.(event);
        // Menus and browser windows restore focus without a new interaction.
        // Only deliberate keyboard focus or normal hover should show a tooltip.
        if (inputState?.current?.suppressFocus) {
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
>(({ className, sideOffset = 4, variant, ...props }, ref) => {
  return (
    <TooltipPrimitive.Portal>
      <ShadeScope>
        <TooltipPrimitive.Content
          ref={ref}
          className={cn(tooltipContentVariants({ variant: variant ?? 'white' }), className)}
          sideOffset={sideOffset}
          {...props}
        />
      </ShadeScope>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
