import MainLayout from '@src/components/layout';
import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const StatsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children}) => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <MainLayout>
            <div className='grid w-full grow grid-cols-[auto_320px]'>
                <div className='px-8'>
                    {children}
                </div>
                <div className='grow border-l py-8 pl-6 pr-8'>
                    <RightSidebarMenu>
                        <RightSidebarMenuLink active={location.pathname === '/' || location.pathname === '/web/'} onClick={() => {
                            navigate('/');
                        }}>
                            <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                            Web
                        </RightSidebarMenuLink>
                        <RightSidebarMenuLink active={location.pathname === '/sources/'} onClick={() => {
                            navigate('/sources/');
                        }}>
                            <LucideIcon.ArrowRightToLine size={16} strokeWidth={1.25} />
                            Sources
                        </RightSidebarMenuLink>
                        <RightSidebarMenuLink active={location.pathname === '/locations/'} onClick={() => {
                            navigate('/locations/');
                        }}>
                            <LucideIcon.Earth size={16} strokeWidth={1.25} />
                            Locations
                        </RightSidebarMenuLink>
                    </RightSidebarMenu>
                </div>
            </div>
        </MainLayout>
    );
};

export default StatsLayout;
