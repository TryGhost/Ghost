import NiceModal, {useModal} from '@ebay/nice-modal-react';
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
    customFooter?: boolean | React.ReactNode;
    formSheet?: boolean;
    stickyFooter?: boolean;
    testId?: string;
}

export const ConfirmationModalContent: React.FC<ConfirmationModalProps> = ({
    title = 'Are you sure?',
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okRunningLabel = '...',
    okVariant = 'default',
    onCancel,
    onOk,
    customFooter,
    formSheet = true,
    stickyFooter = false,
    testId = 'confirmation-modal'
}) => {
    const modal = useModal();
    const [taskState, setTaskState] = useState<'running' | ''>('');
    const isRunning = taskState === 'running';

    const handleCancel = () => {
        if (isRunning) {
            return;
        }

        if (onCancel) {
            onCancel();
        } else {
            modal.remove();
        }
    };

    const handleConfirm = async () => {
        setTaskState('running');

        try {
            await onOk?.(modal);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Unhandled Promise Rejection. Make sure you catch errors in your onOk handler.', error);
        }

        setTaskState('');
    };

    const defaultFooter = (
        <AlertDialogFooter>
            {cancelLabel && (
                <Button className='font-semibold' data-testid='cancel-modal' disabled={isRunning} type='button' variant='ghost' onClick={handleCancel}>
                    {cancelLabel}
                </Button>
            )}
            {okLabel && (
                <Button className='min-w-20' data-testid='ok-modal' disabled={isRunning} type='button' variant={okVariant} onClick={handleConfirm}>
                    {isRunning ? okRunningLabel : okLabel}
                </Button>
            )}
        </AlertDialogFooter>
    );

    const footer = customFooter === undefined ? defaultFooter : customFooter;

    return (
        <AlertDialog open={modal.visible} onOpenChange={open => !open && handleCancel()}>
            <AlertDialogContent
                className={cn(
                    'z-[1100] max-h-[calc(100dvh-4rem)] w-[calc(100%-2rem)] max-w-[540px] gap-0 overflow-y-auto bg-background p-8',
                    formSheet ? 'shadow-md' : 'shadow-xl'
                )}
                data-testid={testId}
                overlayClassName={cn(
                    'z-[1100] bg-foreground/20! backdrop-blur-[3px]',
                    formSheet && 'bg-foreground/10!'
                )}
                onEscapeKeyDown={event => event.stopPropagation()}
            >
                <AlertDialogHeader className='gap-0'>
                    <AlertDialogTitle className='text-xl leading-heading font-bold md:text-2xl'>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className='py-4 text-left text-base text-foreground'>{prompt}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {footer && (stickyFooter ? (
                    <StickyFooter className='-mx-8 -mb-8 w-[calc(100%+4rem)]' contentClassName='px-8' height={84}>
                        {footer}
                    </StickyFooter>
                ) : footer)}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default NiceModal.create(ConfirmationModalContent);
