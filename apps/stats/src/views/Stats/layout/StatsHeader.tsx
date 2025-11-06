import React from 'react';
import {H1, LucideIcon, Navbar, NavbarActions, PageMenu, PageMenuItem, formatNumber} from '@tryghost/shade';
import {useActiveVisitors, useAppContext, useLocation, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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
            <header className='z-40 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
                <div
                    className='relative flex w-full items-center justify-between gap-5 px-8 pb-0 pt-8'
                    data-header='header'
                >
                    <H1
                        className='-ml-px min-h-[35px] max-w-[920px] indent-0 leading-[1.2em]'
                        data-header='header-title'
                    >
                        Analytics
                    </H1>
                    {appSettings?.analytics.webAnalytics && (
                        <div className='flex items-center gap-2 text-sm'>
                            {site?.url && (
                                <div className='hidden items-center gap-1.5 sm:!visible sm:!flex'>
                                    {/* No need for favicon as it's already shown in the left sidebar + globe icon represents "web" better */}
                                    <LucideIcon.Globe className='text-muted-foreground' size={16} strokeWidth={1.5} />
                                    <a
                                        className='text-sm font-medium transition-all hover:opacity-75 dark:text-gray-100'
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
                                className='flex items-center gap-2 text-sm text-muted-foreground'
                                title='Active visitors in the last 5 minutes · Updates every 60 seconds'
                            >
                                <span className='text-sm'>
                                    {isActiveVisitorsLoading ? '' : formatNumber(activeVisitors)} online
                                </span>
                                <div className={`size-2 rounded-full ${isActiveVisitorsLoading ? 'animate-pulse bg-muted' : activeVisitors ? 'bg-green-500' : 'border border-muted-foreground'}`}></div>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <Navbar className='sticky top-0 z-40 flex-col items-start gap-y-5 border-none bg-white/70 py-8 backdrop-blur-md lg:flex-row lg:items-center dark:bg-black'>
                <PageMenu defaultValue={normalizedPath} responsive>
                    <PageMenuItem value="/analytics/" onClick={() => {
                        navigate('/analytics/');
                    }}>Overview</PageMenuItem>

                    {appSettings?.analytics.webAnalytics &&
                        <PageMenuItem value="/analytics/web/" onClick={() => {
                            navigate('/analytics/web/');
                        }}>Web traffic</PageMenuItem>
                    }

                    {appSettings?.newslettersEnabled &&
                        <PageMenuItem value="/analytics/newsletters/" onClick={() => {
                            navigate('/analytics/newsletters/');
                        }}>Newsletters</PageMenuItem>
                    }

                    <PageMenuItem value="/analytics/growth/" onClick={() => {
                        navigate('/analytics/growth/');
                    }}>Growth</PageMenuItem>

                    {appSettings?.analytics.webAnalytics && (
                        <PageMenuItem value="/analytics/locations/" onClick={() => {
                            navigate('/analytics/locations/');
                        }}>Locations</PageMenuItem>
                    )}
                </PageMenu>
                <NavbarActions>
                    {children}
                </NavbarActions>
            </Navbar>
        </>
    );
};

export default StatsHeader;
