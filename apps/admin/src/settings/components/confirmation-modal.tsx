import React, {useState} from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    type ButtonProps,
    LoadingIndicator,
    StickyFooter
} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';

export interface ConfirmationModalProps {
    title?: React.ReactNode;
    prompt?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okRunningLabel?: string;
    okVariant?: ButtonProps['variant'];
    onCancel?: () => void;
    onOk?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
    customFooter?: React.ReactNode;
    formSheet?: boolean;
    stickyFooter?: boolean;
    testId?: string;
}

export type ConfirmationHostProps = {
    visible?: boolean;
    onRemove: () => void;
};

export const ConfirmationModalContent: React.FC<ConfirmationModalProps & ConfirmationHostProps> = ({
    visible = true,
    onRemove,
    title = 'Are you sure?',
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okRunningLabel,
    okVariant = 'default',
    onCancel,
    onOk,
    customFooter,
    formSheet = true,
    stickyFooter = false,
    testId = 'confirmation-modal'
}) => {
    const [taskState, setTaskState] = useState<'running' | ''>('');
    const isRunning = taskState === 'running';
    const runningLabel = okRunningLabel || okLabel;

    const handleCancel = () => {
        if (isRunning) {
            return;
        }

        if (onCancel) {
            onCancel();
        } else {
            onRemove();
        }
    };

    const handleConfirm = async () => {
        setTaskState('running');

        try {
            await onOk?.({remove: onRemove});
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Unhandled Promise Rejection. Make sure you catch errors in your onOk handler.', error);
        }

        setTaskState('');
    };

    const defaultFooter = (
        // Inside the sticky footer the row is stretched to full width, so below
        // `sm` its column-reverse buttons would otherwise touch.
        <AlertDialogFooter className={cn(stickyFooter && 'gap-2')}>
            {cancelLabel && (
                <Button data-testid='cancel-modal' disabled={isRunning} type='button' variant='outline' onClick={handleCancel}>
                    {cancelLabel}
                </Button>
            )}
            {okLabel && (
                <Button aria-busy={isRunning} data-testid='ok-modal' disabled={isRunning} type='button' variant={okVariant} onClick={() => void handleConfirm()}>
                    {isRunning && <LoadingIndicator color='current' size='sm' />}
                    {isRunning ? runningLabel : okLabel}
                </Button>
            )}
        </AlertDialogFooter>
    );

    const footer = customFooter === undefined ? defaultFooter : customFooter;

    return (
        <AlertDialog open={visible} onOpenChange={open => !open && handleCancel()}>
            <AlertDialogContent
                className={cn(
                    'z-[1100] max-h-[calc(100dvh-4rem)] w-[calc(100%-2rem)] overflow-y-auto bg-background',
                    // A sticky grid item is boxed in by its own grid area and never
                    // sticks, so the footer needs a flex column to stick within.
                    // Sticky offsets resolve against the scroll container's content
                    // box, so any bottom padding here becomes dead space the footer
                    // can never reach — the footer supplies its own instead. The
                    // row gap goes too: StickyFooter already opens with a 24px
                    // spacer, and stacking the two left a visible hole above it.
                    stickyFooter && 'flex flex-col gap-0 pb-0'
                )}
                data-testid={testId}
                overlayClassName={cn(
                    'z-[1100] bg-foreground/20! backdrop-blur-[3px]',
                    formSheet && 'bg-foreground/10!'
                )}
                onEscapeKeyDown={event => event.stopPropagation()}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className='text-left text-foreground'>{prompt}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {footer && (stickyFooter ? (
                    // StickyFooter sizes its own box in raw pixels (`height + 24`)
                    // but spaces its parts with `h-6`/`-mb-6`, which Shade's
                    // `--spacing: 0.4rem` scale renders as 38.4px. Pin those three
                    // offsets back to the 24px the component's own maths assumes,
                    // and bleed it across the dialog's horizontal padding.
                    <StickyFooter className='-mx-6 w-auto [&>div:first-child]:h-[24px] [&>div:last-child]:h-[24px]' contentClassName='px-6 mb-[-24px] *:w-full' height={84}>
                        {footer}
                    </StickyFooter>
                ) : footer)}
            </AlertDialogContent>
        </AlertDialog>
    );
};
