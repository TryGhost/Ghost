import React, {useState} from 'react';
import UnblockDialog from './UnblockDialog';
import {Account} from '@src/api/activitypub';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverTrigger,
    buttonVariants
} from '@tryghost/shade';

interface ProfileMenuProps {
    account?: Account,
    children: React.ReactNode;
    onCopyHandle: () => void;
    onBlockAccount: () => void;
    onBlockDomain: () => void;
    disabled?: boolean;
    isBlocked?: boolean;
    isDomainBlocked?: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    account,
    children,
    onCopyHandle,
    onBlockAccount,
    onBlockDomain,
    disabled = false,
    isBlocked = false,
    isDomainBlocked = false
}) => {
    const [dialogType, setDialogType] = useState<'user' | 'domain' | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleCopyHandleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onCopyHandle();
    };

    const handleBlockAccountClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onBlockAccount();
    };

    const handleBlockDomainClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onBlockDomain();
    };

    const handle = account?.handle;
    const domain = handle?.split('@').filter(Boolean)[1];

    const renderBlockView = () => (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                        {dialogType === 'user' ? 'Block this user?' : 'Block this domain?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {dialogType === 'user'
                            ? <><span className='font-semibold text-black'>{handle}</span> will be able to see your public posts, but will no longer be able follow you or interact with your content on the social web.</>
                            : <>All users from <span className='font-semibold text-black'>{domain}</span> will be able to see your public posts, but won&apos;t be able to follow you or interact with your content.</>
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {dialogType !== 'domain' &&
                        <Button className='-ml-3 mr-auto hover:bg-transparent hover:opacity-80' variant='ghost' onClick={(e) => {
                            e.stopPropagation();
                            setDialogType('domain');
                        }}>Block domain instead</Button>
                    }
                    <AlertDialogCancel onClick={e => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={buttonVariants({variant: 'destructive'})}
                        onClick={dialogType === 'user' ? handleBlockAccountClick : handleBlockDomainClick}
                    >
                        Block
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    const renderUnblockView = () => (
        account && <UnblockDialog
            handle={account.handle}
            isDomainBlocked={account.domainBlockedByMe}
            isOpen={dialogOpen}
            isUserBlocked={account.blockedByMe}
            onOpenChange={setDialogOpen}
            onUnblockDomain={onBlockDomain}
            onUnblockUser={onBlockAccount}
        />
    );

    return (
        <>
            <Popover>
                <PopoverTrigger disabled={disabled} asChild onClick={e => e.stopPropagation()}>
                    {children}
                </PopoverTrigger>
                <PopoverContent align="end" className='p-2'>
                    <div className='flex w-48 flex-col'>
                        <PopoverClose asChild>
                            <Button className='justify-start' variant='ghost' onClick={handleCopyHandleClick}>
                            Copy handle
                            </Button>
                        </PopoverClose>
                        <PopoverClose asChild>
                            <Button className='justify-start text-red hover:bg-red/5 hover:text-red' variant='ghost' onClick={(e) => {
                                e.stopPropagation();
                                if (!isBlocked && !isDomainBlocked) {
                                    setDialogType('user');
                                }
                                setDialogOpen(true);
                            }}>
                                {isBlocked ? 'Unblock user' : isDomainBlocked ? 'Unblock domain' : 'Block user'}
                            </Button>
                        </PopoverClose>
                    </div>
                </PopoverContent>
            </Popover>
            {isBlocked || isDomainBlocked ? renderUnblockView() : renderBlockView()}
        </>
    );
};

export default ProfileMenu;
