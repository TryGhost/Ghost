import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {postId} = useParams();

    return (
        <div className='grow border-l py-8 pl-6 pr-0'>
            <RightSidebarMenu className='sticky top-[134px]'>
                <RightSidebarMenuLink onClick={() => {
                    navigate(`/posts/analytics/${postId}`, {crossApp: true});
                }}>
                    <LucideIcon.LayoutTemplate size={16} strokeWidth={1.25} />
                    Overview
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === `/analytics/${postId}/web`} onClick={() => {
                    navigate(`/analytics/${postId}/web`);
                }}>
                    <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                    Web
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === `/analytics/${postId}/growth`} onClick={() => {
                    navigate(`/analytics/${postId}/growth`);
                }}>
                    <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                Growth
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;
