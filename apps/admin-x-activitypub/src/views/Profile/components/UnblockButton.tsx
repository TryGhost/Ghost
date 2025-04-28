import React, {useState} from 'react';
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
    onUnblock: () => void;
    className?: string;
}

const UnblockButton: React.FC<UnblockButtonProps> = ({
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
                    <AlertDialogTitle>Unblock this user?</AlertDialogTitle>
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
