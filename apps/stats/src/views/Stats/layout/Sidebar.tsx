import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className='grow border-l px-6 py-8'>
            <RightSidebarMenu className='sticky top-[33px]'>
                {/* <RightSidebarMenu className='sticky top-[134px]'> */}
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

                <RightSidebarMenuLink active={location.pathname === '/growth/'} onClick={() => {
                    navigate('/growth/');
                }}>
                    <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                Growth
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;
