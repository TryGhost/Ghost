import type {Meta, StoryObj} from '@storybook/react-vite';
import {Coins, Eye, User} from 'lucide-react';

import {Button} from '../../ui/button';
import {Card, CardContent} from '../../ui/card';
import {KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue} from './kpi-card';

const meta = {
    title: 'Features / KPI / Card',
    component: KpiCardHeaderValue,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Card header layout for displaying a KPI metric with optional trend badge. Composes `MetricValue` and `TrendBadge` from the Components layer. Use inside a `Card` (from Components / Card).'
            }
        }
    }
} satisfies Meta<typeof KpiCardHeaderValue>;

export default meta;
type Story = StoryObj<typeof KpiCardHeaderValue>;

export const WithUpTrend: Story = {
    render: () => (
        <Card className='w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Unique visitors
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='up'
                        diffValue='+12.5%'
                        value='2,547'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const WithTrendTooltip: Story = {
    render: () => (
        <Card className='mt-20 w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Unique visitors
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='up'
                        diffTooltip='You’re trending up 12.5% from 3,538 compared to the last 30 days'
                        diffValue='+12.5%'
                        value='2,547'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const WithDownTrend: Story = {
    render: () => (
        <Card className='w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <User size={16} strokeWidth={1.5} />
                        Members
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='down'
                        diffValue='-3.2%'
                        value='1,234'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const WithColorIndicator: Story = {
    render: () => (
        <Card className='w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: 'var(--chart-purple)'}}></span>
                        <Coins size={16} strokeWidth={1.5} />
                        MRR
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='up'
                        diffValue='+8.7%'
                        value='$4,567'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const NoTrend: Story = {
    render: () => (
        <Card className='w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <Eye size={16} strokeWidth={1.5} />
                        Page views
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='empty'
                        value='15,789'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const WithHoverButton: Story = {
    render: () => (
        <Card className='group w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel className='transition-all group-hover:text-foreground'>
                        <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: 'var(--chart-teal)'}}></span>
                        <User size={16} strokeWidth={1.5} />
                        Members
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='same'
                        diffValue='0%'
                        value='2,456'
                    />
                </div>
                <Button
                    className='absolute right-6 translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100'
                    size='sm'
                    variant='outline'
                >
                    View more
                </Button>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};

export const HiddenTrend: Story = {
    render: () => (
        <Card className='w-[350px]'>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel>
                        <Coins size={16} strokeWidth={1.5} />
                        All-time revenue
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection='hidden'
                        value='$125,890'
                    />
                </div>
            </KpiCardHeader>
            <CardContent>Chart placeholder content</CardContent>
        </Card>
    )
};
