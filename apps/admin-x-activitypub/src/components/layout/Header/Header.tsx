import React from 'react';
import useActiveRoute from '@src/hooks/use-active-route';
import {Button, H1, LucideIcon} from '@tryghost/shade';
import {useLocation, useNavigate, useNavigationStack} from '@tryghost/admin-x-framework';

interface HeaderTitleProps {
    title: string;
    backIcon: boolean;
}

const BackButton: React.FC = () => {
    const navigate = useNavigate();
    const {previousPath} = useNavigationStack();

    return (
        <Button className='h-9 w-9 rounded-full bg-white/85 px-2 backdrop-blur-md dark:text-white [&_svg]:size-6' variant='ghost' onClick={() => {
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

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, backIcon}) => {
    if (backIcon) {
        return <BackButton />;
    }
    return (
        <H1>{title}</H1>
    );
};

const Header: React.FC = () => {
    const {canGoBack} = useNavigationStack();
    const location = useLocation();

    const baseRoute = location.pathname.split('/')[1];

    const onlyBackButton = (baseRoute === 'profile-rr');

    const activeRoute = useActiveRoute();
    return (
        <>
            {onlyBackButton ?
                <div className='sticky top-0 z-50 flex h-[102px] items-center px-8'>
                    {canGoBack && <BackButton />}
                </div>
                :
                <div className='sticky top-0 z-50 bg-white/85 backdrop-blur-md dark:bg-black'>
                    <div className='relative flex h-[102px] items-center justify-between gap-5 px-8 before:absolute before:inset-x-8 before:bottom-0 before:block before:border-b before:border-gray-200 before:content-[""] before:dark:border-gray-950'>
                        <HeaderTitle
                            backIcon={canGoBack}
                            title={activeRoute?.pageTitle || ''}
                        />
                    </div>
                </div>
            }
        </>
    );
};

export default Header;
