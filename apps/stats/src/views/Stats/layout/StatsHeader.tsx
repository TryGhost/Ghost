import React from 'react';
import {H1, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger, formatNumber} from '@tryghost/shade';
import {useActiveVisitors} from '@src/hooks/useActiveVisitors';
import {useAppContext, useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface StatsHeaderProps {
    children?: React.ReactNode;
}

const StatsHeader:React.FC<StatsHeaderProps> = ({
    children
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const {appSettings} = useAppContext();
    const {activeVisitors, isLoading: isActiveVisitorsLoading} = useActiveVisitors();

    return (
        <>
            <header className='z-40 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
                <div className='relative flex w-full items-center justify-between gap-5 px-8 pb-0 pt-8'>
                    <H1 className='-ml-px min-h-[35px] max-w-[920px] indent-0 leading-[1.2em]'>
                        Analytics
                    </H1>
                    <div
                        className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'
                        title='Active visitors in the last 5 minutes · Updates every 60 seconds'
                    >
                        <span>
                            {isActiveVisitorsLoading ? '—' : formatNumber(activeVisitors)} online
                        </span>
                        <div className={`size-2 rounded-full ${isActiveVisitorsLoading ? 'animate-pulse bg-muted' : activeVisitors ? 'bg-green-500' : 'border border-muted-foreground'}`}></div>
                    </div>
                </div>
            </header>
            <Navbar className='sticky top-0 z-40 items-center border-none bg-white/70 py-8 backdrop-blur-md dark:bg-black'>
                <Tabs className="w-full" defaultValue={location.pathname} variant='pill'>
                    <TabsList>
                        <TabsTrigger value="/" onClick={() => {
                            navigate('/');
                        }}>
                            Overview
                        </TabsTrigger>

                        {appSettings?.analytics.webAnalytics &&
                            <TabsTrigger value="/web/" onClick={() => {
                                navigate('/web/');
                            }}>
                            Web traffic
                            </TabsTrigger>
                        }

                        <TabsTrigger value="/newsletters/" onClick={() => {
                            navigate('/newsletters/');
                        }}>
                        Newsletters
                        </TabsTrigger>
                        <TabsTrigger value="/growth/" onClick={() => {
                            navigate('/growth/');
                        }}>
                        Growth
                        </TabsTrigger>
                        {appSettings?.analytics.webAnalytics &&
                            <TabsTrigger value="/locations/" onClick={() => {
                                navigate('/locations/');
                            }}>
                            Locations
                            </TabsTrigger>
                        }
                    </TabsList>
                </Tabs>
                <NavbarActions>
                    {children}
                </NavbarActions>
            </Navbar>
        </>
    );
};

export default StatsHeader;
