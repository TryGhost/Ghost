import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/lib/utils';
import { ShadeScope } from '@/shade-scope';

// Radix keeps whether a dialog is modal to itself, and the overlay scroll layout needs to know.
const DialogModalContext = React.createContext(true);

const Dialog = ({ modal = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => (
  <DialogModalContext.Provider value={modal}>
    <DialogPrimitive.Root modal={modal} {...props} />
  </DialogModalContext.Provider>
);

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 transform-gpu bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/60',
      className,
    )}
    data-slot="dialog-overlay"
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// The panel itself, shared by both ways a dialog can sit on the page.
const dialogPanelClassName =
  'z-50 grid w-full max-w-lg transform-gpu gap-6 bg-surface-elevated-2 p-6 shadow-lg outline-hidden duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:rounded-lg';

export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /**
   * How a dialog taller than the window scrolls. `fixed` (the default) pins the dialog near
   * the top of the window, so it needs its own height limit and inner scroll. `overlay` makes
   * the backdrop the scroll container instead: the whole dialog scrolls as one piece, the way
   * a page does.
   */
  scroll?: 'fixed' | 'overlay';
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, scroll = 'fixed', ...props }, ref) => {
  const modal = React.useContext(DialogModalContext);

  const panel = (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        scroll === 'overlay'
          ? 'pointer-events-auto relative rounded-lg'
          : 'fixed top-[8vmin] left-[50%] translate-x-[-50%]',
        dialogPanelClassName,
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  );

  // The space around the dialog is padding on this wrapper, not on the scroll container:
  // browsers leave a scroll container's own bottom padding out of what it scrolls, which
  // would leave the dialog flush with the bottom of the window.
  const scrollingPanel = (
    <div className="flex min-h-full items-start justify-center px-4 py-[8vmin]">{panel}</div>
  );

  return (
    <DialogPortal>
      <ShadeScope>
        {scroll === 'overlay' ? (
          modal ? (
            <DialogOverlay className="overflow-y-auto">{scrollingPanel}</DialogOverlay>
          ) : (
            // Radix renders no backdrop for a non-modal dialog, and the page behind stays
            // usable, so this scroll container lets presses beside the dialog through.
            <div className="pointer-events-none fixed inset-0 z-50 overflow-y-auto">
              {scrollingPanel}
            </div>
          )
        ) : (
          <>
            <DialogOverlay />
            {panel}
          </>
        )}
      </ShadeScope>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:items-end sm:justify-end sm:gap-2 [&_button]:min-w-20',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-xl leading-none font-semibold tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
