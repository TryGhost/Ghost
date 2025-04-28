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

interface ProfileMenuProps {
    trigger: React.ReactNode;
    onCopyHandle: () => void;
    onBlockAccount: () => void;
    disabled?: boolean;
    isBlocked?: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    trigger,
    onCopyHandle,
    onBlockAccount,
    disabled = false,
    isBlocked = false
}) => {
    const handleCopyHandleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onCopyHandle();
    };

    const handleBlockAccountClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onBlockAccount();
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
                                    onClick={e => e.stopPropagation()}
                                >
                                    {isBlocked ? 'Unblock user' : 'Block user'}
                                </Button>
                            </PopoverClose>
                        </AlertDialogTrigger>
                    </div>
                </PopoverContent>
            </Popover>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{isBlocked ? 'Unblock this user?' : 'Block this user?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isBlocked
                            ? 'They will be able to follow you and engage with your public posts.'
                            : 'They will be able to see your public posts, but will no longer be able follow you or interact with your content on the social web.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={e => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={isBlocked ? undefined : buttonVariants({variant: 'destructive'})}
                        onClick={handleBlockAccountClick}
                    >
                        {isBlocked ? 'Unblock' : 'Block'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ProfileMenu;
