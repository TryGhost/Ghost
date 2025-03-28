import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {useNavigate, useNavigationStack} from '@tryghost/admin-x-framework';

interface BackButtonProps {
    onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({onClick}) => {
    const navigate = useNavigate();
    const {previousPath} = useNavigationStack();

    return (
        <Button className='h-9 w-9 rounded-full bg-white/85 px-2 backdrop-blur-md dark:text-white [&_svg]:size-6' variant='ghost' onClick={() => {
            if (onClick) {
                onClick();
                return;
            }

            if (previousPath) {
                navigate(-1);
            } else {
                navigate('/');
            }
        }}>
            <LucideIcon.ArrowLeft size={24} strokeWidth={1.25} />
        </Button>
    );
};

export default BackButton;