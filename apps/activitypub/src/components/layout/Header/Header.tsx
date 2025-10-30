import React from 'react';
import {Button, H1, LucideIcon} from '@tryghost/shade';
import {useNavigationStack, useRouteHasParams} from '@tryghost/admin-x-framework';

import BackButton from '@src/components/global/BackButton';
import useActiveRoute from '@src/hooks/use-active-route';
import {useCurrentPage} from '@src/hooks/use-current-page';
import {useFeatureFlags} from '@src/lib/feature-flags';

import FeedModeDropdown from './FeedModeDropdown';

interface HeaderTitleProps {
    title: string;
    backIcon: boolean;
    showFeedModeDropdown?: boolean;
}

interface MobileMenuButtonProps {
    onToggleMobileSidebar: () => void;
}

interface HeaderProps {
    onToggleMobileSidebar: () => void;
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, backIcon, showFeedModeDropdown}) => {
    if (backIcon) {
        return <BackButton className='-ml-2' />;
    }

    if (showFeedModeDropdown) {
        return (
            <div className='flex grow items-center justify-between'>
                <H1 className='max-md:text-[2.4rem]'>{title}</H1>
                <FeedModeDropdown />
            </div>
        );
    }

    return (
        <H1 className='max-md:text-[2.4rem]'>{title}</H1>
    );
};

const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({onToggleMobileSidebar}) => {
    return (
        <Button
            className='px:0 mr-[-9px] w-[34px] rounded-full bg-white/85 backdrop-blur-md lg:hidden dark:bg-black/85 dark:text-white'
            variant='ghost'
            onClick={onToggleMobileSidebar}
        >
            <LucideIcon.Menu className='!size-5' />
        </Button>
    );
};

const Header: React.FC<HeaderProps> = ({onToggleMobileSidebar}) => {
    const {canGoBack} = useNavigationStack();
    const currentPage = useCurrentPage();
    const routeHasParams = useRouteHasParams();
    const activeRoute = useActiveRoute();
    const {isEnabled} = useFeatureFlags();

    // Logic for special pages
    let onlyBackButton = false;
    if (currentPage === 'profile') {
        onlyBackButton = true;
    }

    if (currentPage === 'notes' && canGoBack) {
        onlyBackButton = true;
    }

    // Avoid back button on main routes
    const backActive = (canGoBack && routeHasParams) || activeRoute?.showBackButton === true;

    // Show feed mode dropdown on reader route with global-feed flag enabled
    const showFeedModeDropdown = currentPage === 'reader' && isEnabled('global-feed');

    return (
        <>
            {onlyBackButton ?
                <div className='sticky left-0 top-8 z-50 inline-block max-lg:flex max-lg:items-center max-lg:justify-between max-lg:pr-[15.5px] max-md:top-4'>
                    <div>{backActive && <BackButton className='ml-6 max-md:ml-[10px]' />}</div>
                    {!backActive && <MobileMenuButton onToggleMobileSidebar={onToggleMobileSidebar} />}
                </div>
                :
                <div className='sticky top-0 z-50 bg-white/85 backdrop-blur-md dark:bg-black'>
                    <div className='relative flex h-[102px] items-center justify-between gap-5 px-[min(4vw,32px)] before:absolute before:inset-x-[min(4vw,32px)] before:bottom-0 before:block before:border-b before:border-gray-200 before:content-[""] max-md:h-[68px] before:dark:border-gray-950'>
                        <HeaderTitle
                            backIcon={backActive}
                            showFeedModeDropdown={showFeedModeDropdown}
                            title={activeRoute?.pageTitle || ''}
                        />
                        <MobileMenuButton onToggleMobileSidebar={onToggleMobileSidebar} />
                    </div>
                </div>
            }
        </>
    );
};

export default Header;
