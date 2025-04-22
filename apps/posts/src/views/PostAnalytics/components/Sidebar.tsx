import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className='grow border-l py-8 pl-6 pr-0'>
            <RightSidebarMenu className='sticky top-[134px]'>
                <RightSidebarMenuLink active={location.pathname === '/' || location.pathname === '/web/'} onClick={() => {
                    navigate('/');
                }}>
                    <LucideIcon.LayoutTemplate size={16} strokeWidth={1.25} />
                    Overview
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === '/analytics/postid/web'} onClick={() => {
                    navigate('/sources/');
                }}>
                    <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                    Web
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;