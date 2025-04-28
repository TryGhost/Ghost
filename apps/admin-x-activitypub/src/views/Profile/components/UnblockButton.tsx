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
    Button
} from '@tryghost/shade';

interface UnblockButtonProps {
    account: Account,
    onUnblock: () => void;
    className?: string;
}

const UnblockButton: React.FC<UnblockButtonProps> = ({
    account,
    onUnblock,
    className = ''
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleUnblock = () => {
        onUnblock();
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger>
                <Button
                    className={`min-w-[90px] ${className}`}
                    variant='destructive'
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isHovered ? 'Unblock' : 'Blocked'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className='mb-1 flex flex-col gap-1'>
                        Unblock this user?
                        <span className='text-base font-normal tracking-normal'>{account.handle}</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        They will be able to follow you and engage with your public posts.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UnblockButton;
