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
                    'top-[50%] left-[50%] h-[calc(100vh-8vmin)] w-[calc(100vw-8vmin)] max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden p-0'
                )}
                data-testid={testId}
            >
                <div className="flex h-full min-h-0">
                    {/* Left: Preview */}
                    <div className="hidden min-h-0 flex-1 flex-col bg-gray-50 dark:bg-black [@media(min-width:801px)]:flex">
                        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                            {preview}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="flex min-h-0 w-full flex-col border-l border-gray-200 dark:border-gray-900 [@media(min-width:801px)]:w-[400px] [@media(min-width:801px)]:shrink-0">
                        <div className="flex items-center justify-between px-6 py-5">
                            <DialogTitle>{title}</DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={handleClose}>Close</Button>
                                <Button onClick={onSave}>{saveLabel}</Button>
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
