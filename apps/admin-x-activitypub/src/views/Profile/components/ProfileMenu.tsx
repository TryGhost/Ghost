import React, {useState} from 'react';
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
    AlertDialogTrigger,
    Button,
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverTrigger,
    buttonVariants
} from '@tryghost/shade';
import {useFeatureFlags} from '@src/lib/feature-flags';

interface ProfileMenuProps {
    account: Account,
    trigger: React.ReactNode;
    onCopyHandle: () => void;
    onBlockAccount: () => void;
    disabled?: boolean;
    isBlocked?: boolean;
    isDomainBlocked?: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    account,
    trigger,
    onCopyHandle,
    onBlockAccount,
    disabled = false,
    isBlocked = false,
    isDomainBlocked = false
}) => {
    const {isEnabled} = useFeatureFlags();
    const [dialogType, setDialogType] = useState<'user' | 'domain' | null>(null);

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
    };

    return (
        <AlertDialog>
            <Popover>
                <PopoverTrigger disabled={disabled} asChild onClick={e => e.stopPropagation()}>
                    {trigger}
                </PopoverTrigger>
                <PopoverContent align="end" className='p-2'>
                    <div className='flex w-48 flex-col'>
                        <PopoverClose asChild>
                            <Button className='justify-start' variant='ghost' onClick={handleCopyHandleClick}>
                                Copy handle
                            </Button>
                        </PopoverClose>
                        <AlertDialogTrigger asChild>
                            <PopoverClose asChild>
                                <Button
                                    className='justify-start text-red hover:bg-red/5 hover:text-red'
                                    variant='ghost'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDialogType('user');
                                    }}
                                >
                                    {isBlocked ? 'Unblock user' : 'Block user'}
                                </Button>
                            </PopoverClose>
                        </AlertDialogTrigger>
                        {isEnabled('block-domain') &&
                            <AlertDialogTrigger asChild>
                                <PopoverClose asChild>
                                    <Button
                                        className='justify-start text-red hover:bg-red/5 hover:text-red'
                                        variant='ghost'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDialogType('domain');
                                        }}
                                    >
                                        {isDomainBlocked ? 'Unblock domain' : 'Block domain'}
                                    </Button>
                                </PopoverClose>
                            </AlertDialogTrigger>
                        }
                    </div>
                </PopoverContent>
            </Popover>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                        {dialogType === 'user'
                            ? (isBlocked ? 'Unblock this user?' : 'Block this user?')
                            : (isDomainBlocked ? 'Unblock this domain?' : 'Block this domain?')}
                        <span className='text-base font-normal tracking-normal'>
                            {dialogType === 'user'
                                ? account.handle
                                : account.handle.split('@').filter(Boolean)[1]}
                        </span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {dialogType === 'user'
                            ? (isBlocked
                                ? 'They will be able to follow you and engage with your public posts.'
                                : 'They will be able to see your public posts, but will no longer be able follow you or interact with your content on the social web.')
                            : (isDomainBlocked
                                ? 'Users from this domain will be able to follow you and engage with your public posts.'
                                : 'All users from this domain will be able to see your public posts, but won\'t be able to follow you or interact with your content.')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={e => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={isBlocked ? undefined : buttonVariants({variant: 'destructive'})}
                        onClick={dialogType === 'user' ? handleBlockAccountClick : handleBlockDomainClick}
                    >
                        {isBlocked ? 'Unblock' : 'Block'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ProfileMenu;
