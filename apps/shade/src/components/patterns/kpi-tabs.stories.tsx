import type {Meta, StoryObj} from '@storybook/react-vite';

import {Tabs, TabsContent, TabsList} from '@/components/ui/tabs';
import {KpiTabTrigger, KpiTabValue} from './kpi-tabs';

const meta = {
    title: 'Patterns / KPI Tabs',
    component: KpiTabValue,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'KPI tabs for analytics dashboards. Each trigger renders a metric label, value, and optional trend badge. Wraps the generic Tabs primitive with `variant=\'kpis\'` styling.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof KpiTabValue>;

export default meta;
type Story = StoryObj<typeof KpiTabValue>;

export const Basic: Story = {
    render: () => (
        <Tabs defaultValue='signups' variant='kpis'>
            <TabsList>
                <KpiTabTrigger value='signups'>
                    <KpiTabValue
                        diffDirection='up'
                        diffValue='+12.5%'
                        label='Signups'
                        value='1,247'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='revenue'>
                    <KpiTabValue
                        diffDirection='up'
                        diffValue='+8.2%'
                        label='Revenue'
                        value='$54,890'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='engagement'>
                    <KpiTabValue
                        diffDirection='down'
                        diffValue='-2.1%'
                        label='Engagement'
                        value='68.4%'
                    />
                </KpiTabTrigger>
            </TabsList>
            <TabsContent value='signups'>
                <div className='p-6'>Signups analytics and charts would go here.</div>
            </TabsContent>
            <TabsContent value='revenue'>
                <div className='p-6'>Revenue analytics and charts would go here.</div>
            </TabsContent>
            <TabsContent value='engagement'>
                <div className='p-6'>Engagement analytics and charts would go here.</div>
            </TabsContent>
        </Tabs>
    ),
    parameters: {
        docs: {
            description: {
                story: 'KPI tabs displaying metrics with trend indicators - perfect for dashboard analytics.'
            }
        }
    }
};

export const WithIcons: Story = {
    render: () => (
        <Tabs defaultValue='users' variant='kpis'>
            <TabsList>
                <KpiTabTrigger value='users'>
                    <KpiTabValue
                        diffDirection='up'
                        diffValue='+15.3%'
                        icon='Users'
                        label='Active Users'
                        value='2,847'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='views'>
                    <KpiTabValue
                        diffDirection='up'
                        diffValue='+22.1%'
                        icon='Eye'
                        label='Page Views'
                        value='18.2K'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='bounce'>
                    <KpiTabValue
                        diffDirection='same'
                        diffValue='0%'
                        icon='MousePointerClick'
                        label='Bounce Rate'
                        value='34.2%'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='conversion'>
                    <KpiTabValue
                        diffDirection='down'
                        diffValue='-0.5%'
                        icon='Target'
                        label='Conversion'
                        value='3.8%'
                    />
                </KpiTabTrigger>
            </TabsList>
            <TabsContent value='users'>
                <div className='p-6'>Active users analytics would go here.</div>
            </TabsContent>
            <TabsContent value='views'>
                <div className='p-6'>Page views analytics would go here.</div>
            </TabsContent>
            <TabsContent value='bounce'>
                <div className='p-6'>Bounce rate analytics would go here.</div>
            </TabsContent>
            <TabsContent value='conversion'>
                <div className='p-6'>Conversion analytics would go here.</div>
            </TabsContent>
        </Tabs>
    ),
    parameters: {
        docs: {
            description: {
                story: 'KPI tabs enhanced with icons for better visual recognition of different metrics.'
            }
        }
    }
};

export const WithColors: Story = {
    render: () => (
        <Tabs defaultValue='organic' variant='kpis'>
            <TabsList>
                <KpiTabTrigger value='organic'>
                    <KpiTabValue
                        color='#10B981'
                        diffDirection='up'
                        diffValue='+18.7%'
                        label='Organic Traffic'
                        value='45.2K'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='paid'>
                    <KpiTabValue
                        color='#3B82F6'
                        diffDirection='up'
                        diffValue='+5.3%'
                        label='Paid Traffic'
                        value='12.8K'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='social'>
                    <KpiTabValue
                        color='#8B5CF6'
                        diffDirection='down'
                        diffValue='-3.2%'
                        label='Social Traffic'
                        value='8.4K'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='direct'>
                    <KpiTabValue
                        color='#F59E0B'
                        diffDirection='up'
                        diffValue='+9.1%'
                        label='Direct Traffic'
                        value='15.6K'
                    />
                </KpiTabTrigger>
            </TabsList>
            <TabsContent value='organic'>
                <div className='p-6'>Organic traffic breakdown would go here.</div>
            </TabsContent>
            <TabsContent value='paid'>
                <div className='p-6'>Paid traffic breakdown would go here.</div>
            </TabsContent>
            <TabsContent value='social'>
                <div className='p-6'>Social traffic breakdown would go here.</div>
            </TabsContent>
            <TabsContent value='direct'>
                <div className='p-6'>Direct traffic breakdown would go here.</div>
            </TabsContent>
        </Tabs>
    ),
    parameters: {
        docs: {
            description: {
                story: 'KPI tabs with color-coded indicators to categorize different data sources or types.'
            }
        }
    }
};

export const WithoutTrends: Story = {
    render: () => (
        <Tabs defaultValue='subscribers' variant='kpis'>
            <TabsList>
                <KpiTabTrigger value='subscribers'>
                    <KpiTabValue
                        diffDirection='hidden'
                        icon='UserPlus'
                        label='Total Subscribers'
                        value='12,847'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='posts'>
                    <KpiTabValue
                        diffDirection='hidden'
                        icon='FileText'
                        label='Published Posts'
                        value='89'
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value='comments'>
                    <KpiTabValue
                        diffDirection='hidden'
                        icon='MessageSquare'
                        label='Total Comments'
                        value='2,156'
                    />
                </KpiTabTrigger>
            </TabsList>
            <TabsContent value='subscribers'>
                <div className='p-6'>Subscriber details would go here.</div>
            </TabsContent>
            <TabsContent value='posts'>
                <div className='p-6'>Posts overview would go here.</div>
            </TabsContent>
            <TabsContent value='comments'>
                <div className='p-6'>Comments overview would go here.</div>
            </TabsContent>
        </Tabs>
    ),
    parameters: {
        docs: {
            description: {
                story: 'KPI tabs showing absolute values without trend indicators - useful for cumulative or static metrics.'
            }
        }
    }
};
