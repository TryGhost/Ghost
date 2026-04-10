import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button} from '@tryghost/shade/components';

interface DirtyConfirmModalProps {
    title?: string;
    description?: React.ReactNode;
}

const DirtyConfirmModal: React.FC<DirtyConfirmModalProps> = ({
    title = 'Are you sure you want to leave this page?',
    description = (
        <div className="space-y-2">
            <p>{`Hey there! It looks like you didn't save the changes you made.`}</p>
            <p>Save before you go!</p>
        </div>
    )
}) => {
    const modal = useModal();
    const prevVisibleRef = useRef(modal.visible);

    useEffect(() => {
        if (prevVisibleRef.current && !modal.visible) {
            modal.resolveHide();
            modal.remove();
        }

        prevVisibleRef.current = modal.visible;
    }, [modal]);

    const close = (shouldLeave: boolean) => {
        modal.resolve(shouldLeave);
        void modal.hide();
    };

    return (
        <AlertDialog
            open={modal.visible}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    close(false);
                }
            }}
        >
            <AlertDialogContent
                data-testid="welcome-email-dirty-confirm-modal"
                onEscapeKeyDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={() => close(false)}>Stay</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button variant="destructive" onClick={() => close(true)}>Leave</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default NiceModal.create(DirtyConfirmModal);
