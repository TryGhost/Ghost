import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import {
  overlayTint,
  SAFE_AREA_DIALOG_HEIGHT,
  SAFE_AREA_DIALOG_X,
  useHostedModal,
  useModalOpen,
} from '@/lib/app-overlay';
import { cn } from '@/lib/utils';
import { keepOpenOnToast } from '@/lib/toast-press';
import { ShadeScope } from '@/shade-scope';

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const [rootProps, provideOpen] = useModalOpen(props);
  return provideOpen(<DialogPrimitive.Root {...rootProps} />);
};

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
      'fixed inset-0 z-50 transform-gpu data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      overlayTint('dialog'),
      className,
    )}
    data-slot="dialog-overlay"
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/*
 * In a Ghost app, the app SDK sets the safe area, the part of the window the app has to itself,
 * as `--ghost-safe-area-inset-*`. A dialog sits where it would without them, centred on the
 * window, and moves only as far as it must to stay inside: in an app, Admin's chrome is outside,
 * and Admin shows nothing of the app's overlay there. Anywhere else the variables aren't set, and
 * nothing moves.
 */
const fixedDialogClassName = cn(
  'fixed top-[max(8vmin,var(--ghost-safe-area-inset-top,0px))] left-[50%] sm:rounded-lg',
  SAFE_AREA_DIALOG_X,
);

// In an app, a dialog also stays between the safe area's top and bottom edges: it moves up only
// as far as it must, keeps a little way from the bottom, and scrolls inside when it's taller than
// that. In the overlay, the safe area is all of the window that shows; in the page, the rest is
// under Admin's chrome.
const inAppFixedDialogClassName = cn(
  SAFE_AREA_DIALOG_HEIGHT,
  'translate-y-[clamp(var(--ghost-safe-area-inset-top,0px)_-_max(8vmin,var(--ghost-safe-area-inset-top,0px)),0px,100dvh_-_var(--ghost-safe-area-inset-bottom,0px)_-_1rem_-_max(8vmin,var(--ghost-safe-area-inset-top,0px))_-_100%)]',
);

// Scrolling as a page does, the dialog sits inside its backdrop, which scrolls.
const scrollingDialogClassName = 'pointer-events-auto relative rounded-lg';

// In an app, the scroller is the safe area, with its scrollbar at the safe area's edge. The
// dialog starts where a fixed one would, 8vmin from the window's top or at the safe area's, ends
// a little way above the safe area's bottom, and sits as near the window's centre as the safe area
// lets it: it moves only within its wrapper, a
// size container, so it allows for the wrapper's padding and the scrollbar.
const inAppScrollerClassName =
  'top-[var(--ghost-safe-area-inset-top,0px)] right-[var(--ghost-safe-area-inset-right,0px)] bottom-[var(--ghost-safe-area-inset-bottom,0px)] left-[var(--ghost-safe-area-inset-left,0px)]';
const inAppScrollingWrapperClassName =
  '@container pt-[max(0px,calc(8vmin_-_var(--ghost-safe-area-inset-top,0px)))] pb-[max(1rem,calc(8vmin_-_var(--ghost-safe-area-inset-bottom,0px)))]';
const inAppScrollingDialogClassName =
  'translate-x-[clamp((100%_-_100cqw)/2,(var(--ghost-safe-area-inset-right,0px)_-_var(--ghost-safe-area-inset-left,0px))/2,(100cqw_-_100%)/2)]';

// The panel itself, shared by both ways a dialog can sit on the page.
const dialogPanelClassName =
  'z-50 grid w-full max-w-lg transform-gpu gap-6 bg-surface-elevated-2 p-6 shadow-lg [--sticky-footer-background:var(--surface-elevated-2)] outline-hidden duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95';

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
  // In an app inside Ghost Admin, the dialog renders in the app's overlay, over all of Admin,
  // and Admin draws the backdrop, which shows through the dialog's own.
  const {
    container,
    inApp,
    modal,
    overlayStyle,
    ref: contentRef,
    wrap,
  } = useHostedModal('dialog', ref);

  // The overlay's context goes around the content, not inside it, so an `asChild` content's own
  // element stays the one Radix gives the dialog's role, handlers and ref.
  const panel = wrap(
    <DialogPrimitive.Content
      ref={contentRef}
      className={cn(
        dialogPanelClassName,
        scroll === 'overlay' ? scrollingDialogClassName : fixedDialogClassName,
        inApp && (scroll === 'overlay' ? inAppScrollingDialogClassName : inAppFixedDialogClassName),
        className,
      )}
      {...props}
      onInteractOutside={(event) => keepOpenOnToast(event, props.onInteractOutside)}
    >
      {children}
    </DialogPrimitive.Content>,
  );

  // The space around the dialog is padding on this wrapper, not on the scroll container:
  // browsers leave a scroll container's own bottom padding out of what it scrolls, which
  // would leave the dialog flush with the bottom of the window.
  const scrollingPanel = (
    <div
      className={cn(
        'flex min-h-full items-start justify-center px-4 py-[8vmin]',
        inApp && inAppScrollingWrapperClassName,
      )}
    >
      {panel}
    </div>
  );
  const scroller = cn('overflow-y-auto', inApp && inAppScrollerClassName);

  return (
    <DialogPortal container={container}>
      <ShadeScope>
        {scroll === 'overlay' ? (
          modal ? (
            // The dialog sits inside the backdrop here, so the backdrop animates as long as the
            // dialog does; otherwise closing unmounts the dialog part-way through its animation.
            inApp ? (
              // In an app, the backdrop covers the whole frame, and the safe area scrolls in it.
              <DialogOverlay className="duration-200" style={overlayStyle}>
                <div className={cn('fixed z-50', scroller)} data-slot="dialog-scroller">
                  {scrollingPanel}
                </div>
              </DialogOverlay>
            ) : (
              <DialogOverlay className={cn(scroller, 'duration-200')} style={overlayStyle}>
                {scrollingPanel}
              </DialogOverlay>
            )
          ) : (
            // Radix renders no backdrop for a non-modal dialog, and the page behind stays
            // usable, so this scroll container lets presses beside the dialog through.
            <div
              className={cn('pointer-events-none fixed inset-0 z-50', scroller)}
              data-slot="dialog-scroller"
            >
              {scrollingPanel}
            </div>
          )
        ) : (
          <>
            <DialogOverlay style={overlayStyle} />
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
      'flex flex-col-reverse sm:flex-row sm:items-end sm:justify-end sm:gap-2',
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
    className={cn(
      'text-xl leading-none font-semibold tracking-tight in-data-[admin7-design=true]:font-title',
      className,
    )}
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
