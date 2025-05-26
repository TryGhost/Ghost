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
    Button,
    H4,
    LucideIcon
} from '@tryghost/shade';
import {toast} from 'sonner';

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
    const [dialogState, setDialogState] = useState(() => {
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

        return {
            mode,
            userUnblocked: false,
            domainUnblocked: false
        };
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

        setDialogState(prev => ({
            ...prev,
            mode,
            userUnblocked: false,
            domainUnblocked: false
        }));
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

        toast.success('User unblocked');
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

        toast.success('Domain unblocked');
    };

    const domain = handle.split('@').filter(Boolean)[1];

    const renderDualView = () => (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                    Unblock
                </AlertDialogTitle>
                <AlertDialogDescription className='!mt-4' asChild>
                    <div className='flex flex-col rounded-md border'>
                        <div className='flex justify-between gap-6 p-5'>
                            <div className='flex flex-col gap-1'>
                                <H4>Unblock user</H4>
                                <p><span className='font-semibold text-black'>{handle}</span> will be able to follow you and engage with your public posts.</p>
                            </div>
                            <Button className={`gap-1 ${dialogState.userUnblocked ? 'pointer-events-none border-green bg-green text-white hover:bg-green hover:text-white' : 'text-red hover:text-red-400'}`} variant='outline' onClick={handleUnblock}>
                                <LucideIcon.User />
                                {dialogState.userUnblocked ? 'User unblocked' : 'Unblock user'}
                            </Button>
                        </div>
                        <div className='border-t' />
                        <div className='flex justify-between gap-6 p-5'>
                            <div className='flex flex-col gap-1'>
                                <H4>Unblock domain</H4>
                                <p>Users from <span className='font-semibold text-black'>{domain}</span> will be able to follow you and engage with your public posts.</p>
                            </div>
                            <Button className={`gap-1 ${dialogState.domainUnblocked ? 'pointer-events-none border-green bg-green text-white hover:bg-green hover:text-white' : 'text-red hover:text-red-400'}`} variant='outline' onClick={handleDomainUnblock}>
                                <LucideIcon.Globe />
                                {dialogState.domainUnblocked ? 'Domain unblocked' : 'Unblock domain'}
                            </Button>
                        </div>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button onClick={() => handleDialogClose(false)}>OK</Button>
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
            <AlertDialogContent className={`${dialogState.mode === 'dual' && 'max-w-[600px]'}`}>
                {dialogState.mode === 'dual' ? renderDualView() : renderSingleView()}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UnblockDialog;
