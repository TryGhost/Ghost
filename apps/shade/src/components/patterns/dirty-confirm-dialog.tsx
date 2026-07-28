import * as React from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {Button} from '@/components/ui/button';
import {Stack} from '@/components/primitives';
import {cn} from '@/lib/utils';

export interface DirtyConfirmDialogProps {
    className?: string;
    description?: React.ReactNode;
    open: boolean;
    testId?: string;
    title?: React.ReactNode;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
}

export interface DirtyConfirmDialogController {
    confirm: (dirty: boolean, action: () => void) => void;
    dialogProps: Pick<DirtyConfirmDialogProps, 'open' | 'onConfirm' | 'onOpenChange'>;
}

export function useDirtyConfirmation(): DirtyConfirmDialogController {
    const pendingAction = React.useRef<(() => void) | null>(null);
    const [open, setOpen] = React.useState(false);

    const confirm = React.useCallback((dirty: boolean, action: () => void) => {
        if (!dirty) {
            action();
            return;
        }

        pendingAction.current = action;
        setOpen(true);
    }, []);

    const handleOpenChange = React.useCallback((nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            pendingAction.current = null;
        }
    }, []);

    const handleConfirm = React.useCallback(() => {
        const action = pendingAction.current;
        pendingAction.current = null;
        setOpen(false);
        action?.();
    }, []);

    return {
        confirm,
        dialogProps: {
            open,
            onConfirm: handleConfirm,
            onOpenChange: handleOpenChange
        }
    };
}

export function DirtyConfirmDialog({
    className,
    description,
    open,
    testId = 'confirmation-modal',
    title = 'Are you sure you want to leave this page?',
    onConfirm,
    onOpenChange
}: DirtyConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={cn('z-[1100]', className)}
                data-testid={testId}
                overlayClassName='z-[1100]'
                onEscapeKeyDown={event => event.stopPropagation()}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <Stack gap='sm'>
                            {description || (
                                <>
                                    <p>{`Hey there! It looks like you didn't save the changes you made.`}</p>
                                    <p>Save before you go!</p>
                                </>
                            )}
                        </Stack>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant='outline'>Stay</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90' asChild>
                        <Button variant='destructive' onClick={onConfirm}>Leave</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
