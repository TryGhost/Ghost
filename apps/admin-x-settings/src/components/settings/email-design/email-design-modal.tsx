import React, {useEffect, useRef} from 'react';
import {Button, Dialog, DialogContent, DialogTitle, cn} from '@tryghost/shade';

interface EmailDesignModalProps {
    title: string;
    preview: React.ReactNode;
    sidebar: React.ReactNode;
    dirty?: boolean;
    saveLabel?: string;
    onSave: () => void;
    onClose: () => void;
    testId?: string;
}

const EmailDesignModal: React.FC<EmailDesignModalProps> = ({
    title,
    preview,
    sidebar,
    dirty = false,
    saveLabel = 'Save',
    onSave,
    onClose,
    testId
}) => {
    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

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

    const handleClose = () => {
        if (dirty) {
            if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <Dialog open onOpenChange={handleClose}>
            <DialogContent
                className={cn(
                    'top-[50%] left-[50%] flex h-[calc(100vh-8vmin)] w-[calc(100vw-8vmin)] max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden p-0'
                )}
                data-testid={testId}
            >
                <div className="flex h-full grow">
                    {/* Left: Preview */}
                    <div className="bg-gray-50 relative hidden grow flex-col dark:bg-black [@media(min-width:801px)]:flex">
                        <div className="absolute inset-0 m-5 flex items-center justify-center">
                            {preview}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="border-gray-200 dark:border-gray-900 relative flex size-full flex-col border-l [@media(min-width:801px)]:w-auto [@media(min-width:801px)]:basis-[400px]">
                        <div className="border-gray-200 dark:border-gray-900 flex max-h-[82px] items-center justify-between border-b px-6 py-5">
                            <DialogTitle>{title}</DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={handleClose}>Close</Button>
                                <Button onClick={onSave}>{saveLabel}</Button>
                            </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 top-[82px] grow overflow-y-auto px-6 py-5">
                            {sidebar}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmailDesignModal;
