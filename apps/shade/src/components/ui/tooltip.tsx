import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { usePortalContainer } from '@/lib/app-overlay';
import { cn } from '@/lib/utils';
import { ShadeScope } from '@/shade-scope';

interface TooltipInput {
  state: React.RefObject<{ suppressFocus: boolean; windowBlurred: boolean }>;
  /** Also follows the input in `target`, a document other than the page's. */
  watch: (target: Document) => void;
}

const TooltipInputContext = React.createContext<TooltipInput | null>(null);

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
  const watching = React.useRef(new Map<Document, () => void>());

  const watch = React.useCallback((target: Document) => {
    if (watching.current.has(target)) {
      return;
    }
    const suppressFocus = () => {
      inputState.current.suppressFocus = true;
    };
    const onKeyDown = () => {
      inputState.current.suppressFocus = false;
      inputState.current.windowBlurred = false;
    };
    const onPointerMove = () => {
      inputState.current.windowBlurred = false;
    };
    target.addEventListener('pointerdown', suppressFocus, true);
    target.addEventListener('pointermove', onPointerMove, true);
    target.addEventListener('keydown', onKeyDown, true);
    watching.current.set(target, () => {
      target.removeEventListener('pointerdown', suppressFocus, true);
      target.removeEventListener('pointermove', onPointerMove, true);
      target.removeEventListener('keydown', onKeyDown, true);
    });
  }, []);

  React.useEffect(() => {
    const documents = watching.current;
    watch(document);
    const onWindowBlur = () => {
      inputState.current.suppressFocus = true;
      inputState.current.windowBlurred = true;
    };
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      for (const stop of documents.values()) {
        stop();
      }
      documents.clear();
    };
  }, [watch]);

  const input = React.useMemo(() => ({ state: inputState, watch }), [watch]);

  return (
    <TooltipInputContext.Provider value={input}>
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
  const inputState = React.useContext(TooltipInputContext)?.state;
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
  const input = React.useContext(TooltipInputContext);
  const inputState = input?.state;
  // In a dialog an app renders in its overlay, over all of Admin, input arrives in the overlay's
  // document, and the page's window has lost focus to it.
  const container = usePortalContainer();
  React.useEffect(() => {
    if (container && container.ownerDocument !== document) {
      input?.watch(container.ownerDocument);
    }
  }, [container, input]);

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
    <TooltipPrimitive.Portal container={usePortalContainer()}>
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
