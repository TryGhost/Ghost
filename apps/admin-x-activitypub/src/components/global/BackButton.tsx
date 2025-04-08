import React from 'react';
import {Button, LucideIcon, cn} from '@tryghost/shade';
import {useNavigate, useNavigationStack} from '@tryghost/admin-x-framework';

interface BackButtonProps {
    className?: string;
    onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({className, onClick}) => {
    const navigate = useNavigate();
    const {previousPath} = useNavigationStack();

    return (
        <Button
            className={cn('size-9 rounded-full bg-white/85 px-2 backdrop-blur-md dark:bg-black/85 dark:text-white [&_svg]:size-6', className)}
            variant='ghost'
            onClick={() => {
                if (onClick) {
                    onClick();
                    return;
                }

                if (previousPath) {
                    navigate(-1);
                } else {
                    navigate('/');
                }
            }}
        >
            <LucideIcon.ArrowLeft size={24} strokeWidth={1.25} />
        </Button>
    );
};

export default BackButton;
