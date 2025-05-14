import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
// import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
// import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {postId} = useParams();
    // const {settings} = useGlobalData();
    // const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    return (
        <div className='grow py-8 pr-0'>
            <RightSidebarMenu>
                <RightSidebarMenuLink active={location.pathname === `/analytics/x/${postId}`} onClick={() => {
                    navigate(`/analytics/x/${postId}`);
                }}>
                    <LucideIcon.LayoutTemplate size={16} strokeWidth={1.25} />
                    Overview
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === `/analytics/x/${postId}/web`} onClick={() => {
                    navigate(`/analytics/x/${postId}/web`);
                }}>
                    <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                    Web
                </RightSidebarMenuLink>

                <RightSidebarMenuLink active={location.pathname === `/analytics/x/${postId}/newsletter`} onClick={() => {
                    navigate(`/analytics/x/${postId}/newsletter`);
                }}>
                    <LucideIcon.Mail size={16} strokeWidth={1.25} />
                    Newsletter
                </RightSidebarMenuLink>

                <RightSidebarMenuLink active={location.pathname === `/analytics/x/${postId}/growth`} onClick={() => {
                    navigate(`/analytics/x/${postId}/growth`);
                }}>
                    <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                Growth
                </RightSidebarMenuLink>
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;
