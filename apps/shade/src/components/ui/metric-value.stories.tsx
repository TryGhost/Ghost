import type {Meta, StoryObj} from '@storybook/react-vite';
import {Eye, Users} from 'lucide-react';
import {MetricValue} from './metric-value';
import {TrendBadge} from './trend-badge';

const meta = {
    title: 'Components / MetricValue',
    component: MetricValue,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Generic primitive for displaying a numeric metric with an optional label and a trailing element (typically a TrendBadge).'
            }
        }
    },
    argTypes: {
        size: {
            control: {type: 'select'},
            options: ['md', 'lg']
        }
    }
} satisfies Meta<typeof MetricValue>;

export default meta;
type Story = StoryObj<typeof MetricValue>;

export const Default: Story = {
    args: {
        label: 'Visitors',
        value: '12,540'
    }
};

export const WithTrend: Story = {
    args: {
        label: 'Visitors',
        value: '12,540',
        trailing: <TrendBadge direction='up' value='+5.2%' />
    }
};

export const Large: Story = {
    args: {
        label: 'Members',
        size: 'lg',
        value: '34,210',
        trailing: <TrendBadge direction='down' value='-1.8%' />
    }
};

export const ValueOnly: Story = {
    args: {
        value: '1,234'
    }
};

export const LabelWithIcon: Story = {
    args: {
        label: (
            <>
                <Eye />
                Visitors
            </>
        ),
        value: '12,540',
        trailing: <TrendBadge direction='up' value='+5.2%' />
    }
};

export const Examples: Story = {
    render: () => (
        <div className='flex flex-col gap-8'>
            <MetricValue
                label='Visitors'
                trailing={<TrendBadge direction='up' value='+5.2%' />}
                value='12,540'
            />
            <MetricValue
                label={
                    <>
                        <Users />
                        Members
                    </>
                }
                size='lg'
                trailing={<TrendBadge direction='down' value='-1.8%' />}
                value='34,210'
            />
            <MetricValue value='1,234' />
        </div>
    )
};
