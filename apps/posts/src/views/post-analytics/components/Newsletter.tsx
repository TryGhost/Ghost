import OpenedList from './newsletter/OpenedList';
import React from 'react';
import SentList from './newsletter/SentList';
import {Badge, Card, CardContent} from '@tryghost/shade';
import {StatsTabItem, StatsTabTitle, StatsTabValue, StatsTabs, StatsTabsGroup} from './StatsTabs';

interface newsletterProps {};

const Newsletter: React.FC<newsletterProps> = () => {
    const tabs = [
        [
            {
                key: 'sent',
                title: 'Sent',
                value: '1,697',
                badge: '100%',
                content: <SentList />
            },
            {
                key: 'opened',
                title: 'Opened',
                value: '560',
                badge: '75%',
                content: <OpenedList />
            },
            {
                key: 'clicked',
                title: 'Clicked',
                value: '21',
                badge: '18%',
                content: <SentList />
            }
        ],
        [
            {
                key: 'unsubscribed',
                title: 'Unsubscribed',
                value: '21',
                badge: '',
                content: <SentList />
            },
            {
                key: 'feedback',
                title: 'Feedback',
                value: '5',
                badge: '',
                content: <SentList />
            },
            {
                key: 'spam',
                title: 'Marked as spam',
                value: '17',
                badge: '',
                content: <SentList />
            },
            {
                key: 'bounced',
                title: 'Bounced',
                value: '81',
                badge: '',
                content: <SentList />
            }
        ]
    ];

    const [currentTab, setCurrentTab] = React.useState(tabs[0][0].key);

    const Content: React.FC = () => {
        return tabs.map((tabGroup) => {
            const selectedTab = tabGroup.find(tab => tab.key === currentTab);
            return selectedTab?.content;
        });
    };

    return (
        <div className='grid grow grid-cols-[auto_300px] gap-6 py-6'>
            <Card className='self-start'>
                <CardContent>
                    <Content />
                </CardContent>
            </Card>
            <div className='-mt-px flex basis-[300px] flex-col'>
                <StatsTabs>
                    {tabs.map(group => (
                        <StatsTabsGroup>
                            {group.map(item => (
                                <StatsTabItem isActive={currentTab === item.key} onClick={() => {
                                    setCurrentTab(item.key);
                                }}>
                                    <StatsTabTitle>
                                        {item.title}
                                        {item.badge && <Badge variant='secondary'>{item.badge}</Badge>}
                                    </StatsTabTitle>
                                    <StatsTabValue>{item.value}</StatsTabValue>
                                </StatsTabItem>
                            ))}
                        </StatsTabsGroup>
                    )
                    )}
                </StatsTabs>
            </div>
        </div>
    );
};

export default Newsletter;
