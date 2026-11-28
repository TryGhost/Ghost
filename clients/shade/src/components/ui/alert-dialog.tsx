import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { overlayTint, useHostedModal, useModalOpen } from '@/lib/app-overlay';
import { SAFE_AREA_DIALOG_HEIGHT, SAFE_AREA_DIALOG_X } from '@/lib/safe-area';
import { cn } from '@/lib/utils';
import type { ButtonProps } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { useShade } from '@/providers/shade-context';
import { ShadeScope } from '@/shade-scope';

const AlertDialog = (props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => {
  const [rootProps, provideOpen] = useModalOpen(props);
  return provideOpen(<AlertDialogPrimitive.Root {...rootProps} />);
};

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

// Above SettingsModal (z-[1000]), so an alert opened from a settings modal shows in front of it.
const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-[1100] transform-gpu data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      overlayTint('dialog'),
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

type AlertDialogContentProps = React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Content
> & {
  overlayClassName?: string;
};

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => {
  const { portalContainer, inApp, backdropStyle, contentRef, withPortalContainer } = useHostedModal(
    'dialog',
    ref,
  );
  return (
    <AlertDialogPortal container={portalContainer}>
      <ShadeScope>
        <AlertDialogOverlay
          className={overlayClassName}
          style={backdropStyle}
          onClick={(e) => e.stopPropagation()}
        />
        {withPortalContainer(
          <AlertDialogPrimitive.Content
            ref={contentRef}
            className={cn(
              'fixed top-[20%] left-[50%] z-[1100] grid max-w-lg translate-y-[-20%] gap-6 bg-surface-elevated-2 p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-[18%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-[18%] sm:rounded-lg',
              SAFE_AREA_DIALOG_X,
              inApp && SAFE_AREA_DIALOG_HEIGHT,
              // Moves up only as far as it must to stay between the safe area's top and bottom.
              inApp &&
                'translate-y-[clamp(var(--ghost-safe-area-inset-top,0px)_-_20dvh,-20%,80dvh_-_var(--ghost-safe-area-inset-bottom,0px)_-_1rem_-_100%)]',
              className,
            )}
            {...props}
          >
            {children}
          </AlertDialogPrimitive.Content>,
        )}
      </ShadeScope>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-y-2 text-center sm:text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-xl font-semibold in-data-[admin7-design=true]:font-title', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn('text-base', className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & Pick<ButtonProps, 'variant'>
>(({ className, variant, ...props }, ref) => {
  const { controlShape } = useShade();

  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(buttonVariants({ shape: controlShape, variant }), className)}
      {...props}
      data-control-shape={controlShape}
    />
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const { controlShape } = useShade();

  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        buttonVariants({ shape: controlShape, variant: 'outline' }),
        'mt-2 sm:mt-0',
        className,
      )}
      {...props}
      data-control-shape={controlShape}
    />
  );
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
