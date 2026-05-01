import type {Meta, StoryObj} from '@storybook/react-vite';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, MetricCardHeader, MetricCardHeaderLabel, MetricCardHeaderValue} from './card';
import {Button} from './button';
import {Eye, User, Coins} from 'lucide-react';

const meta = {
    title: 'Components / Card',
    component: Card,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Flexible containers for displaying content with consistent styling. Includes standard cards for general content and specialized KPI cards for displaying metrics and trends.'
            }
        }
    }
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <CardHeader key="header">
                <CardTitle>Create project</CardTitle>
                <CardDescription>Deploy your new project in one-click.</CardDescription>
            </CardHeader>,

            <CardContent key="content">
                Card contents
            </CardContent>,

            <CardFooter key="footer" className="flex grow justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
            </CardFooter>
        ]
    }
};

export const KpiCardWithUpTrend: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Unique visitors
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="up"
                        diffValue="+12.5%"
                        value="2,547"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardWithTrendTooltip: Story = {
    args: {
        className: 'w-[350px] mt-20',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Unique visitors
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="up"
                        diffTooltip="You’re trending up 12.5% from 3,538 compared to the last 30 days"
                        diffValue="+12.5%"
                        value="2,547"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardWithDownTrend: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <User size={16} strokeWidth={1.5} />
                        Members
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="down"
                        diffValue="-3.2%"
                        value="1,234"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardWithColorIndicator: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: 'var(--chart-purple)'}}></span>
                        <Coins size={16} strokeWidth={1.5} />
                        MRR
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="up"
                        diffValue="+8.7%"
                        value="$4,567"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardNoTrend: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Page views
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="empty"
                        value="15,789"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardWithHoverButton: Story = {
    args: {
        className: 'w-[350px] group',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel className='transition-all group-hover:text-foreground'>
                        <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: 'var(--chart-teal)'}}></span>
                        <User size={16} strokeWidth={1.5} />
                        Members
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="same"
                        diffValue="0%"
                        value="2,456"
                    />
                </div>
                <Button
                    className='absolute right-6 translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100'
                    size='sm'
                    variant='outline'
                >
                    View more
                </Button>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};

export const KpiCardHiddenTrend: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <MetricCardHeader key="kpi-header" className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <MetricCardHeaderLabel>
                        <Coins size={16} strokeWidth={1.5} />
                        All-time revenue
                    </MetricCardHeaderLabel>
                    <MetricCardHeaderValue
                        diffDirection="hidden"
                        value="$125,890"
                    />
                </div>
            </MetricCardHeader>,
            <CardContent key="content">
                Chart placeholder content
            </CardContent>
        ]
    }
};
