import React from 'react';
import {H1, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger, ViewHeader} from '@tryghost/shade';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface StatsHeaderProps {
    children?: React.ReactNode;
}

const StatsHeader:React.FC<StatsHeaderProps> = ({
    children
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
            <ViewHeader className='min-h-0 pb-6 pt-9 before:hidden'>
                <H1>Stats</H1>
            </ViewHeader>
            <Navbar>
                <Tabs className="w-full" defaultValue={location.pathname} variant='navbar'>
                    <TabsList>
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
                        <TabsTrigger value="/sources/" onClick={() => {
                            navigate('/sources/');
                        }}>
                        Sources
                        </TabsTrigger>
                        <TabsTrigger value="/locations/" onClick={() => {
                            navigate('/locations/');
                        }}>
                        Locations
                        </TabsTrigger>
                        <TabsTrigger value="/growth/" onClick={() => {
                            navigate('/growth/');
                        }}>
                        Growth
                        </TabsTrigger>
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
