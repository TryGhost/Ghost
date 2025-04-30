import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    return (
        <div className='grow border-l py-8 pl-6 pr-0'>
            <RightSidebarMenu className='sticky top-[134px]'>
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

                {labs.trafficAnalyticsAlpha &&
                    <RightSidebarMenuLink active={location.pathname === '/growth/'} onClick={() => {
                        navigate('/growth/');
                    }}>
                        <LucideIcon.Sprout size={16} strokeWidth={1.25} />
                    Growth
                    </RightSidebarMenuLink>
                }
            </RightSidebarMenu>
        </div>
    );
};

export default Sidebar;