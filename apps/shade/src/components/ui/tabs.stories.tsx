import type {Meta, StoryObj} from '@storybook/react';
import {Tabs, TabsContent, TabsList, TabsTrigger, KpiTabTrigger, KpiTabValue} from './tabs';

const meta = {
    title: 'Components / Tabs',
    component: Tabs,
    tags: ['autodocs']
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        defaultValue: 'account',
        variant: 'button-sm',
        children: [
            <TabsList key="list" className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>,

            <TabsContent key="account" value="account">
                Account contents
            </TabsContent>,

            <TabsContent key="password" value="password">
                Password contents
            </TabsContent>
        ]
    }
};

export const KPIBasic: Story = {
    args: {
        defaultValue: 'signups',
        variant: 'kpis',
        children: [
            <TabsList key="list">
                <KpiTabTrigger value="signups">
                    <KpiTabValue
                        diffDirection="up"
                        diffValue="+12.5%"
                        label="Signups"
                        value="1,247"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="revenue">
                    <KpiTabValue
                        diffDirection="up"
                        diffValue="+8.2%"
                        label="Revenue"
                        value="$54,890"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="engagement">
                    <KpiTabValue
                        diffDirection="down"
                        diffValue="-2.1%"
                        label="Engagement"
                        value="68.4%"
                    />
                </KpiTabTrigger>
            </TabsList>,

            <TabsContent key="signups" value="signups">
                <div className="p-6">Signups analytics and charts would go here.</div>
            </TabsContent>,

            <TabsContent key="revenue" value="revenue">
                <div className="p-6">Revenue analytics and charts would go here.</div>
            </TabsContent>,

            <TabsContent key="engagement" value="engagement">
                <div className="p-6">Engagement analytics and charts would go here.</div>
            </TabsContent>
        ]
    }
};

export const KPIWithIcons: Story = {
    args: {
        defaultValue: 'users',
        variant: 'kpis',
        children: [
            <TabsList key="list">
                <KpiTabTrigger value="users">
                    <KpiTabValue
                        diffDirection="up"
                        diffValue="+15.3%"
                        icon="Users"
                        label="Active Users"
                        value="2,847"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="views">
                    <KpiTabValue
                        diffDirection="up"
                        diffValue="+22.1%"
                        icon="Eye"
                        label="Page Views"
                        value="18.2K"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="bounce">
                    <KpiTabValue
                        diffDirection="same"
                        diffValue="0%"
                        icon="MousePointerClick"
                        label="Bounce Rate"
                        value="34.2%"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="conversion">
                    <KpiTabValue
                        diffDirection="down"
                        diffValue="-0.5%"
                        icon="Target"
                        label="Conversion"
                        value="3.8%"
                    />
                </KpiTabTrigger>
            </TabsList>,

            <TabsContent key="users" value="users">
                <div className="p-6">Active users analytics would go here.</div>
            </TabsContent>,

            <TabsContent key="views" value="views">
                <div className="p-6">Page views analytics would go here.</div>
            </TabsContent>,

            <TabsContent key="bounce" value="bounce">
                <div className="p-6">Bounce rate analytics would go here.</div>
            </TabsContent>,

            <TabsContent key="conversion" value="conversion">
                <div className="p-6">Conversion analytics would go here.</div>
            </TabsContent>
        ]
    }
};

export const KPIWithColors: Story = {
    args: {
        defaultValue: 'organic',
        variant: 'kpis',
        children: [
            <TabsList key="list">
                <KpiTabTrigger value="organic">
                    <KpiTabValue
                        color="#10B981"
                        diffDirection="up"
                        diffValue="+18.7%"
                        label="Organic Traffic"
                        value="45.2K"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="paid">
                    <KpiTabValue
                        color="#3B82F6"
                        diffDirection="up"
                        diffValue="+5.3%"
                        label="Paid Traffic"
                        value="12.8K"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="social">
                    <KpiTabValue
                        color="#8B5CF6"
                        diffDirection="down"
                        diffValue="-3.2%"
                        label="Social Traffic"
                        value="8.4K"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="direct">
                    <KpiTabValue
                        color="#F59E0B"
                        diffDirection="up"
                        diffValue="+9.1%"
                        label="Direct Traffic"
                        value="15.6K"
                    />
                </KpiTabTrigger>
            </TabsList>,

            <TabsContent key="organic" value="organic">
                <div className="p-6">Organic traffic breakdown would go here.</div>
            </TabsContent>,

            <TabsContent key="paid" value="paid">
                <div className="p-6">Paid traffic breakdown would go here.</div>
            </TabsContent>,

            <TabsContent key="social" value="social">
                <div className="p-6">Social traffic breakdown would go here.</div>
            </TabsContent>,

            <TabsContent key="direct" value="direct">
                <div className="p-6">Direct traffic breakdown would go here.</div>
            </TabsContent>
        ]
    }
};

export const KPIWithoutTrends: Story = {
    args: {
        defaultValue: 'subscribers',
        variant: 'kpis',
        children: [
            <TabsList key="list">
                <KpiTabTrigger value="subscribers">
                    <KpiTabValue
                        diffDirection="hidden"
                        icon="UserPlus"
                        label="Total Subscribers"
                        value="12,847"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="posts">
                    <KpiTabValue
                        diffDirection="hidden"
                        icon="FileText"
                        label="Published Posts"
                        value="89"
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="comments">
                    <KpiTabValue
                        diffDirection="hidden"
                        icon="MessageSquare"
                        label="Total Comments"
                        value="2,156"
                    />
                </KpiTabTrigger>
            </TabsList>,

            <TabsContent key="subscribers" value="subscribers">
                <div className="p-6">Subscriber details would go here.</div>
            </TabsContent>,

            <TabsContent key="posts" value="posts">
                <div className="p-6">Posts overview would go here.</div>
            </TabsContent>,

            <TabsContent key="comments" value="comments">
                <div className="p-6">Comments overview would go here.</div>
            </TabsContent>
        ]
    }
};

