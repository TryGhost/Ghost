import * as React from 'react';
import SentList from './newsletter/SentList';
import {Badge} from '@tryghost/shade';
import {StatsTabItem, StatsTabTitle, StatsTabValue, StatsTabs, StatsTabsGroup} from './StatsTabs';
// import {Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem} from '@tryghost/shade';

interface newsletterProps {};

const Newsletter: React.FC<newsletterProps> = () => {
    return (
        <div className='grid grow grid-cols-[auto_300px] gap-8 py-5'>
            <SentList />
            <div className='-mt-px flex basis-[300px] flex-col'>
                <StatsTabs>
                    <StatsTabsGroup>
                        <StatsTabItem isActive>
                            <StatsTabTitle>
                                Sent
                            </StatsTabTitle>
                            <StatsTabValue>1,697</StatsTabValue>
                        </StatsTabItem>
                        <StatsTabItem>
                            <StatsTabTitle>
                                Opened
                                <Badge variant='secondary'>75%</Badge>
                            </StatsTabTitle>
                            <StatsTabValue>560</StatsTabValue>
                        </StatsTabItem>
                        <StatsTabItem>
                            <StatsTabTitle>
                                Clicked
                                <Badge variant='secondary'>18%</Badge>
                            </StatsTabTitle>
                            <StatsTabValue>21</StatsTabValue>
                        </StatsTabItem>
                    </StatsTabsGroup>

                    <StatsTabsGroup>
                        <StatsTabItem>
                            <StatsTabTitle>Unsubscribed</StatsTabTitle>
                            <StatsTabValue>29</StatsTabValue>
                        </StatsTabItem>
                        <StatsTabItem>
                            <StatsTabTitle>Feedback</StatsTabTitle>
                            <StatsTabValue>5</StatsTabValue>
                        </StatsTabItem>
                        <StatsTabItem>
                            <StatsTabTitle>Marked as spam</StatsTabTitle>
                            <StatsTabValue>17</StatsTabValue>
                        </StatsTabItem>
                        <StatsTabItem>
                            <StatsTabTitle>Bounced</StatsTabTitle>
                            <StatsTabValue>81</StatsTabValue>
                        </StatsTabItem>
                    </StatsTabsGroup>
                </StatsTabs>
            </div>
        </div>
    );
};

export default Newsletter;
