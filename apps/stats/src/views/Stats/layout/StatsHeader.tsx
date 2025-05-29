import React from 'react';
import {H1, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {useFeatureFlag} from '@src/hooks/useFeatureFlag';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface StatsHeaderProps {
    children?: React.ReactNode;
}

const StatsHeader:React.FC<StatsHeaderProps> = ({
    children
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const alphaFlag = useFeatureFlag('trafficAnalyticsAlpha', '/');

    return (
        <>
            <header className='z-50 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
                <div className='relative flex w-full items-start justify-between gap-5 px-8 pb-0 pt-8'>
                    <H1 className='-ml-px min-h-[35px] max-w-[920px] indent-0 leading-[1.2em]'>
                        Stats
                    </H1>
                </div>
            </header>
            <Navbar className='sticky top-0 z-50 items-center border-none bg-white/70 py-8 backdrop-blur-md dark:bg-black'>
                <Tabs className="w-full" defaultValue={location.pathname} variant='pill'>
                    <TabsList>
                        {alphaFlag.isEnabled &&
                        <TabsTrigger value="/overview/" onClick={() => {
                            navigate('/overview/');
                        }}>
                            Overview
                        </TabsTrigger>
                        }
                        <TabsTrigger value="/" onClick={() => {
                            navigate('/');
                        }}>
                        Web traffic
                        </TabsTrigger>
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
                        <TabsTrigger value="/locations/" onClick={() => {
                            navigate('/locations/');
                        }}>
                        Locations
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <NavbarActions>
                    {children}
                </NavbarActions>
            </Navbar>
            {/* <header className='z-50 -mx-8'>
                <div className='flex w-full flex-col items-stretch gap-8 p-8'>
                    <H1 className='mt-1'>Stats</H1>
                    <Navbar className='sticky top-0 border-none bg-white/70 pt-0.5 backdrop-blur-md dark:bg-black'>
                        <Tabs className="w-full" defaultValue={location.pathname} variant='pill'>
                            <TabsList>
                                {alphaFlag.isEnabled &&
                                <TabsTrigger value="/overview/" onClick={() => {
                                    navigate('/overview/');
                                }}>
                                    Overview
                                </TabsTrigger>
                                }
                                <TabsTrigger value="/" onClick={() => {
                                    navigate('/');
                                }}>
                                Web traffic
                                </TabsTrigger>
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
                                <TabsTrigger value="/locations/" onClick={() => {
                                    navigate('/locations/');
                                }}>
                                Locations
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <NavbarActions>
                            {children}
                        </NavbarActions>
                    </Navbar>
                </div>
            </header> */}
        </>
    );
};

export default StatsHeader;
