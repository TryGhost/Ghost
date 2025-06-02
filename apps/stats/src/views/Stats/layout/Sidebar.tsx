import React from 'react';
import {LucideIcon, RightSidebarMenu, RightSidebarMenuLink} from '@tryghost/shade';
// import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
// import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Sidebar:React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // const {settings} = useGlobalData();
    // const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

    return (
        <div className='sticky top-[102px] flex h-[calc(100vh-102px)] grow flex-col justify-between'>
            {/* <RightSidebarMenu className='sticky top-[33px]'> */}
            <RightSidebarMenu>
                <RightSidebarMenuLink active={location.pathname === '/' || location.pathname === '/web/'} onClick={() => {
                    navigate('/');
                }}>
                    <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                Web
                </RightSidebarMenuLink>
                <RightSidebarMenuLink active={location.pathname === '/newsletters/'} onClick={() => {
                    navigate('/newsletters/');
                }}>
                    <LucideIcon.Mail size={16} strokeWidth={1.25} />
                Newsletters
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
            {/* <footer className='flex items-center gap-1 p-8 px-3'>
                <a className='flex items-center gap-1 text-[1.2rem] text-gray-800 hover:text-black' href="https://ghost.org/docs">
                    <span>Learn about Analytics</span>
                </a>
                <LucideIcon.Dot className='text-gray-500' size={16} />
                <a className='flex items-center gap-1 text-[1.2rem] text-gray-800 hover:text-black' href="https://ghost.org/docs">
                    <span>Feedback</span>
                </a>
            </footer> */}
        </div>
    );
};

export default Sidebar;
