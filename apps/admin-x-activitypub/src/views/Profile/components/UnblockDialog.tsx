import React, {useCallback, useEffect, useState} from 'react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Button
} from '@tryghost/shade';
import {showToast} from '@tryghost/admin-x-design-system';

type DialogMode = 'idle' | 'dual' | 'userOnly' | 'domainOnly';

interface UnblockDialogProps {
    handle: string;
    isUserBlocked: boolean;
    isDomainBlocked: boolean;
    onUnblockUser: () => Promise<void> | void;
    onUnblockDomain: () => Promise<void> | void;
    trigger?: React.ReactNode;
    onUnblockComplete?: () => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const UnblockDialog: React.FC<UnblockDialogProps> = ({
    handle,
    isUserBlocked,
    isDomainBlocked,
    onUnblockUser,
    onUnblockDomain,
    trigger,
    onUnblockComplete,
    isOpen: externalIsOpen,
    onOpenChange: externalOnOpenChange
}) => {
    const [internalDialogOpen, setInternalDialogOpen] = useState(false);
    const [dialogState, setDialogState] = useState({
        mode: 'idle' as DialogMode,
        userUnblocked: false,
        domainUnblocked: false
    });

    const isControlled = externalIsOpen !== undefined;
    const dialogOpen = isControlled ? externalIsOpen : internalDialogOpen;

    const [wasOpened, setWasOpened] = useState(false);

    const initializeDialogState = useCallback(() => {
        const bothBlocked = isUserBlocked && isDomainBlocked;
        const userOnlyBlocked = isUserBlocked && !isDomainBlocked;
        const domainOnlyBlocked = !isUserBlocked && isDomainBlocked;

        let mode: DialogMode = 'idle';
        if (bothBlocked) {
            mode = 'dual';
        } else if (userOnlyBlocked) {
            mode = 'userOnly';
        } else if (domainOnlyBlocked) {
            mode = 'domainOnly';
        }

        setDialogState({
            mode,
            userUnblocked: false,
            domainUnblocked: false
        });
    }, [isUserBlocked, isDomainBlocked]);

    useEffect(() => {
        if (dialogOpen && !wasOpened) {
            initializeDialogState();
            setWasOpened(true);
        } else if (!dialogOpen) {
            setWasOpened(false);
        }
    }, [dialogOpen, wasOpened, initializeDialogState]);

    const handleDialogOpen = () => {
        if (isControlled) {
            externalOnOpenChange?.(true);
        } else {
            setInternalDialogOpen(true);
        }
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            if (isControlled) {
                externalOnOpenChange?.(false);
            } else {
                setInternalDialogOpen(false);
            }
        }
    };

    const handleUnblock = async () => {
        await onUnblockUser();

        setDialogState(prev => ({
            ...prev,
            userUnblocked: true
        }));

        if (dialogState.mode !== 'dual' || dialogState.domainUnblocked) {
            handleDialogClose(false);
            onUnblockComplete?.();
        }

        showToast({
            title: 'User unblocked',
            type: 'success'
        });
    };

    const handleDomainUnblock = async () => {
        await onUnblockDomain();

        setDialogState(prev => ({
            ...prev,
            domainUnblocked: true
        }));

        if (dialogState.mode !== 'dual' || dialogState.userUnblocked) {
            handleDialogClose(false);
            onUnblockComplete?.();
        }

        showToast({
            title: 'Domain unblocked',
            type: 'success'
        });
    };

    const domain = handle.split('@').filter(Boolean)[1];

    const renderDualView = () => (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                    Unblock user or domain?
                </AlertDialogTitle>
                <AlertDialogDescription>
                    <span className='font-semibold text-black'>{handle}</span> and everyone from <span className='font-semibold text-black'>{domain}</span> are currently blocked. Which would you like to unblock?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className='mr-auto'>Cancel</AlertDialogCancel>
                <Button
                    className={`${dialogState.userUnblocked && 'pointer-events-none bg-green hover:bg-green'}`}
                    onClick={handleUnblock}
                >
                    {dialogState.userUnblocked ? 'User unblocked' : 'Unblock user'}
                </Button>
                <Button
                    className={`${dialogState.domainUnblocked && 'pointer-events-none bg-green hover:bg-green'}`}
                    onClick={handleDomainUnblock}
                >
                    {dialogState.domainUnblocked ? 'Domain unblocked' : 'Unblock domain'}
                </Button>
            </AlertDialogFooter>
        </>
    );

    const renderSingleView = () => {
        const isUserBlock = dialogState.mode === 'userOnly';

        return (
            <>
                <AlertDialogHeader>
                    <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                        {isUserBlock ? 'Unblock this user?' : 'Unblock this domain?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isUserBlock
                            ? <><span className='font-semibold text-black'>{handle}</span> will be able to follow you and engage with your public posts.</>
                            : <>Users from <span className='font-semibold text-black'>{domain}</span> will be able to follow you and engage with your public posts.</>
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button onClick={isUserBlock ? handleUnblock : handleDomainUnblock}>
                        Unblock
                    </Button>
                </AlertDialogFooter>
            </>
        );
    };

    return (
        <AlertDialog open={dialogOpen} onOpenChange={handleDialogClose}>
            {trigger && (
                <AlertDialogTrigger asChild onClick={handleDialogOpen}>
                    {trigger}
                </AlertDialogTrigger>
            )}
            <AlertDialogContent>
                {dialogState.mode === 'dual' ? renderDualView() : renderSingleView()}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UnblockDialog;
