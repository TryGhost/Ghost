import React from 'react';
import {H1} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {Navbar, NavbarNavigation, PageMenu, PageMenuItem} from '@tryghost/shade/components';
import {useActiveVisitors, useAppContext, useLocation, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/global-data-provider';

interface StatsHeaderProps {
    children?: React.ReactNode;
}

const StatsHeader:React.FC<StatsHeaderProps> = ({
    children
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const {appSettings} = useAppContext();
    const {site, statsConfig} = useGlobalData();
    const {activeVisitors, isLoading: isActiveVisitorsLoading} = useActiveVisitors({
        statsConfig,
        enabled: appSettings?.analytics?.webAnalytics ?? false
    });
    const normalizedPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;

    return (
        <>
            <header className='z-40 -mx-6 bg-white/70 backdrop-blur-md dark:bg-background'>
                <div
                    className='relative flex w-full items-center justify-between gap-5 px-6 pt-5 pb-0'
                    data-header='header'
                >
                    <H1
                        className='flex min-h-[var(--control-height)] items-center text-lg font-semibold tracking-normal whitespace-nowrap'
                        data-header='header-title'
                    >
                        Analytics
                    </H1>
                    {appSettings?.analytics.webAnalytics && (
                        <div className='flex items-center gap-2'>
                            {site?.url && (
                                <div className='hidden items-center gap-1.5 sm:visible! sm:flex!'>
                                    {/* No need for favicon as it's already shown in the left sidebar + globe icon represents "web" better */}
                                    <LucideIcon.Globe className='text-muted-foreground' size={16} strokeWidth={1.5} />
                                    <a
                                        className='font-medium transition-all hover:opacity-75 dark:text-gray-100'
                                        href={site.url}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                        title={`Visit ${new URL(site.url).hostname}`}
                                    >
                                        {new URL(site.url).hostname}
                                    </a>
                                    <span className='text-border'>|</span>
                                </div>
                            )}
                            <div
                                className='flex items-center gap-2 text-muted-foreground'
                                title='Active visitors in the last 5 minutes · Updates every 60 seconds'
                            >
                                <span>
                                    {isActiveVisitorsLoading ? '' : formatNumber(activeVisitors)} online
                                </span>
                                <div className={`size-2 rounded-full ${isActiveVisitorsLoading ? 'animate-pulse bg-muted' : activeVisitors ? 'bg-green-500' : 'border border-muted-foreground'}`}></div>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <Navbar className='sticky top-0 z-40 transform-gpu flex-col items-start gap-y-0 border-none bg-white/70 pt-9 pb-6 backdrop-blur-md lg:flex-row lg:items-center dark:bg-background'>
                <NavbarNavigation>
                    <PageMenu defaultValue={normalizedPath} responsive>
                        <PageMenuItem value="/analytics/" onClick={() => {
                            navigate('/analytics/');
                        }}>
                        Overview
                        </PageMenuItem>

                        {appSettings?.analytics.webAnalytics &&
                        <PageMenuItem value="/analytics/web/" onClick={() => {
                            navigate('/analytics/web/');
                        }}>
                            Web traffic
                        </PageMenuItem>
                        }

                        {appSettings?.newslettersEnabled &&
                        <PageMenuItem value="/analytics/newsletters/" onClick={() => {
                            navigate('/analytics/newsletters/');
                        }}>
                            Newsletters
                        </PageMenuItem>
                        }

                        <PageMenuItem value="/analytics/growth/" onClick={() => {
                            navigate('/analytics/growth/');
                        }}>
                        Growth
                        </PageMenuItem>
                    </PageMenu>
                </NavbarNavigation>
                {children}
            </Navbar>
        </>
    );
};

export default StatsHeader;
