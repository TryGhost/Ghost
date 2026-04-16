import DirtyConfirmModal from './dirty-confirm-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import {Button, Dialog, DialogContent, DialogTitle} from '@tryghost/shade/components';
import {type OkProps} from '@tryghost/admin-x-framework/hooks';
import {cn} from '@tryghost/shade/utils';

interface EmailDesignModalProps {
    open: boolean;
    title: string;
    preview: React.ReactNode;
    sidebar: React.ReactNode;
    dirty?: boolean;
    isLoading?: boolean;
    okProps?: Pick<OkProps, 'color' | 'disabled' | 'label'>;
    onSave: () => void;
    onClose: () => void;
    afterClose?: () => void;
    testId?: string;
}

const EmailDesignModal: React.FC<EmailDesignModalProps> = ({
    open,
    title,
    preview,
    sidebar,
    dirty = false,
    isLoading = false,
    okProps,
    onSave,
    onClose,
    afterClose,
    testId
}) => {
    const onSaveRef = useRef(onSave);
    const prevOpenRef = useRef(open);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        if (prevOpenRef.current && !open) {
            afterClose?.();
        }

        prevOpenRef.current = open;
    }, [afterClose, open]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                onSaveRef.current();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleClose = async () => {
        if (!dirty) {
            onClose();
            return;
        }

        const shouldLeave = await NiceModal.show(DirtyConfirmModal) as boolean;
        if (shouldLeave) {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleClose();
                }
            }}
        >
            <DialogContent
                className={cn(
                    'top-[50%] left-[50%] h-[calc(100vh-8vmin)] w-[calc(100vw-8vmin)] max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden p-0'
                )}
                data-testid={testId}
                onEscapeKeyDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleClose();
                }}
            >
                <div className="flex h-full min-h-0">
                    <div className="hidden min-h-0 flex-1 flex-col bg-gray-50 dark:bg-black [@media(min-width:801px)]:flex">
                        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                            {preview}
                        </div>
                    </div>

                    <div className="flex min-h-0 w-full flex-col border-l border-gray-200 dark:border-gray-900 [@media(min-width:801px)]:w-[400px] [@media(min-width:801px)]:shrink-0">
                        <div className="flex items-center justify-between px-6 py-5">
                            <DialogTitle>{title}</DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => handleClose()}>Close</Button>
                                <Button
                                    className={okProps?.color === 'green' ? 'bg-green text-white hover:bg-green/90' : undefined}
                                    disabled={isLoading || okProps?.disabled}
                                    variant={okProps?.color === 'red' ? 'destructive' : 'default'}
                                    onClick={onSave}
                                >
                                    {okProps?.label || 'Save'}
                                </Button>
                            </div>
                        </div>
                        {sidebar}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmailDesignModal;
