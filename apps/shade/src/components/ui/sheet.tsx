'use client';

// Disable sourcemap for this file due to source map resolution errors
import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { overlayTint, useHostedModal, useModalOpen } from '@/lib/app-overlay';
import { cn } from '@/lib/utils';
import { ShadeScope } from '@/shade-scope';

const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => {
  const [rootProps, provideOpen] = useModalOpen(props);
  return provideOpen(<SheetPrimitive.Root {...rootProps} />);
};

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      overlayTint('sheet'),
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// Each side docks at the edge of the safe area a Ghost app's SDK sets as
// `--ghost-safe-area-inset-*`, clear of Admin's chrome. Anywhere else the variables aren't set,
// and it docks at the window's edge.
const sheetVariants = cva(
  'fixed z-50 gap-4 bg-surface-elevated p-8 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'top-[var(--ghost-safe-area-inset-top,0px)] right-[var(--ghost-safe-area-inset-right,0px)] left-[var(--ghost-safe-area-inset-left,0px)] border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'right-[var(--ghost-safe-area-inset-right,0px)] bottom-[var(--ghost-safe-area-inset-bottom,0px)] left-[var(--ghost-safe-area-inset-left,0px)] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'top-[var(--ghost-safe-area-inset-top,0px)] bottom-[var(--ghost-safe-area-inset-bottom,0px)] left-[var(--ghost-safe-area-inset-left,0px)] w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'top-[var(--ghost-safe-area-inset-top,0px)] right-[var(--ghost-safe-area-inset-right,0px)] bottom-[var(--ghost-safe-area-inset-bottom,0px)] w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => {
  // In an app inside Ghost Admin, the sheet renders in the app's overlay, over all of Admin,
  // and Admin draws the backdrop, which shows through the sheet's own. Whichever its side, it
  // docks at the edge of the safe area the app SDK sets, which Admin's chrome is outside of.
  const { container, inApp, overlayStyle, ref: contentRef, wrap } = useHostedModal('sheet', ref);
  return (
    <SheetPortal container={container}>
      <ShadeScope>
        <SheetOverlay style={overlayStyle} />
        {wrap(
          <SheetPrimitive.Content
            ref={contentRef}
            className={cn(
              sheetVariants({ side }),
              // In an app, it also scrolls inside the safe area when it's taller than that.
              inApp && 'overflow-y-auto',
              inApp &&
                (side === 'top' || side === 'bottom') &&
                'max-h-[calc(100dvh_-_var(--ghost-safe-area-inset-top,0px)_-_var(--ghost-safe-area-inset-bottom,0px))]',
              // And it's never wider than the safe area. On its width, so a caller's own
              // `max-w-*` only narrows it.
              inApp &&
                (side === 'left' || side === 'right') &&
                'w-[min(75%,calc(100vw_-_var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px)))]',
              className,
            )}
            {...props}
          >
            <SheetPrimitive.Close
              className={cn(
                'top-4 right-4 z-50 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-secondary',
                // In an app, against the sheet's own corner on whichever side it docks. Outside
                // one, against the window's, so it stays put as the sheet scrolls.
                inApp ? 'absolute' : 'fixed',
              )}
              // Radix's focus loop moves focus here without scrolling, which in an app can leave
              // it out of sight above a sheet that's scrolled.
              onFocus={
                inApp
                  ? (event) => event.currentTarget.scrollIntoView({ block: 'nearest' })
                  : undefined
              }
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
            {children}
          </SheetPrimitive.Content>,
        )}
      </ShadeScope>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1 text-center sm:text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      'text-xl font-semibold text-foreground in-data-[admin7-design=true]:font-title',
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
