import * as React from 'react';
import SentList from './newsletter/SentList';
// import SubNavItem from './SubNavigation';
import {Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem} from '@tryghost/shade';

interface newsletterProps {};

const Newsletter: React.FC<newsletterProps> = () => {
    return (
        <div className='grid grow grid-cols-[auto_320px] gap-5'>
            <div className='py-5'>
                <SentList />
            </div>
            <div className='flex basis-[320px] flex-col gap-px border-l py-5 pl-5'>
                <Sidebar className="w-full bg-transparent" collapsible="none">
                    <SidebarContent>
                        <SidebarGroup className='p-0'>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive>
                                            <a href='javascript:;'>
                                                <span>Sent</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>1,697</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Opened</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>1,184</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Clicked</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>750</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup className='p-0'>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Unsubscribed</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>29</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Feedback</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>65</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Marked as spam</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>0</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <a href='javascript:;'>
                                                <span>Bounced</span>
                                            </a>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge>6</SidebarMenuBadge>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>
                {/* <SubNavItem>
                    <>
                        <span>Sent</span>
                        <span>1,697</span>
                    </>
                </SubNavItem> */}
            </div>
        </div>
    );
};

export default Newsletter;
