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
                    // row gap goes too: it lands between the issue list and the
                    // footer and reads as an empty band above the buttons.
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
                    // StickyFooter sizes its own box in raw pixels but spaces its
                    // parts with `h-6`/`-mb-6`, which Shade's `--spacing: 0.4rem`
                    // scale renders as 38.4px rather than the 24px its own maths
                    // assumes — so the box is sized here explicitly, and it bleeds
                    // across the dialog's horizontal padding.
                    //
                    // The leading spacer goes entirely. Both it and the content div
                    // are `sticky bottom-0` with `bg-background`, but the content
                    // div is 84px tall and sits a layer above, so it already masks
                    // the full visible strip on its own and the spacer is never
                    // seen mid-scroll. At the bottom of the scroll everything
                    // returns to flow and the spacer becomes a visible empty band
                    // between the last row and the buttons.
                    //
                    // The trailing shadow rule goes with it. It's a decorative
                    // scroll affordance that reads as a hairline drawn straight
                    // across the buttons here, and with the spacer gone there is
                    // nothing left for it to shade.
                    //
                    // That leaves the content div as the only part still in flow,
                    // so its negative margin has to go too or the 84px box would
                    // reserve 24px of slack the `sticky bottom-0` content can never
                    // drop into — the same empty band, just below the buttons
                    // instead of above them. Content height, flow height and box
                    // height all sit at 84px, which keeps the buttons on the
                    // container's bottom edge.
                    <StickyFooter
                        className='-mx-6 w-auto [&>div:first-child]:hidden [&>div:last-child]:hidden'
                        contentClassName='px-6 mb-0 *:w-full'
                        height={84}
                        style={{bottom: 0, height: '84px'}}
                    >
                        {footer}
                    </StickyFooter>
                ) : footer)}
            </AlertDialogContent>
        </AlertDialog>
    );
};
