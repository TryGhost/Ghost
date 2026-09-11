import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';

// Overrides Shade's centred, sized dialog surface with a full-viewport one.
const FRAME =
  'top-0 left-0 h-dvh w-full max-w-none translate-0 gap-0 rounded-none border-0 p-0 shadow-none sm:rounded-none';

const LAYOUTS = {
  /** A fixed header row above a body that owns its own scrolling. */
  header: 'grid-rows-[auto_1fr]',
  /** One scrolling region, with the title exposed to screen readers only. */
  plain: 'grid-rows-[1fr] overflow-y-auto',
} as const;

type DialogContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

export interface FullscreenDialogProps extends Omit<DialogContentProps, 'title'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Non-modal leaves the page behind interactive; the frame still covers it. */
  modal?: boolean;
  title: ReactNode;
  layout?: keyof typeof LAYOUTS;
  /** Controls rendered in the header row beside the title. */
  headerActions?: ReactNode;
}

/**
 * The editor's fullscreen dialog frame. Closing it restores focus to the opener,
 * unless the caller's own `onCloseAutoFocus` claims the event first.
 */
export function FullscreenDialog({
  open,
  onOpenChange,
  modal = true,
  title,
  layout = 'plain',
  headerActions,
  className,
  children,
  onCloseAutoFocus,
  ...props
}: FullscreenDialogProps) {
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Radix restores focus to a DialogTrigger; these dialogs open from state instead,
  // so the element focused as they opened is the opener.
  useLayoutEffect(() => {
    // Radix fires onCloseAutoFocus a tick after `open` flips, so only capture here.
    if (open && !wasOpenRef.current) {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    wasOpenRef.current = open;
  }, [open]);

  const returnFocus = (event: Event) => {
    onCloseAutoFocus?.(event);

    const opener = openerRef.current;
    openerRef.current = null;

    if (event.defaultPrevented || !opener?.isConnected) {
      return;
    }
    event.preventDefault();
    opener.focus();
  };

  return (
    <Dialog modal={modal} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(FRAME, LAYOUTS[layout], className)}
        onCloseAutoFocus={returnFocus}
        // The frame covers the viewport, so an outside interaction is never a dismissal.
        onInteractOutside={(event) => event.preventDefault()}
        {...props}
      >
        {layout === 'header' ? (
          <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-border-default p-4">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {headerActions}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">{title}</DialogTitle>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
