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
            <ViewHeader className='before:hidden'>
                <H1>Stats</H1>
            </ViewHeader>
            <Navbar className='border-none pt-0.5'>
                <Tabs className="w-full" defaultValue={location.pathname} variant='pill'>
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
