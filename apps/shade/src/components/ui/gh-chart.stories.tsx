import type {Meta, StoryObj} from '@storybook/react-vite';
import {GhAreaChart, type GhAreaChartDataItem} from './gh-chart';

const meta = {
    title: 'Components / Ghost Chart',
    component: GhAreaChart,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Ghost-specific area charts for analytics dashboards. Built on Recharts with custom tooltips, trend indicators, and optimized date formatting for time-series data visualization.'
            }
        }
    },
    argTypes: {
        data: {
            control: false
        },
        range: {
            control: {type: 'number'}
        },
        color: {
            control: {type: 'color'}
        }
    }
} satisfies Meta<typeof GhAreaChart>;

export default meta;
type Story = StoryObj<typeof GhAreaChart>;

// Sample data for stories
const sampleData: GhAreaChartDataItem[] = [
    {date: '2024-01-01', value: 120, formattedValue: '120', label: 'Visitors'},
    {date: '2024-01-02', value: 95, formattedValue: '95', label: 'Visitors'},
    {date: '2024-01-03', value: 180, formattedValue: '180', label: 'Visitors'},
    {date: '2024-01-04', value: 220, formattedValue: '220', label: 'Visitors'},
    {date: '2024-01-05', value: 160, formattedValue: '160', label: 'Visitors'},
    {date: '2024-01-06', value: 310, formattedValue: '310', label: 'Visitors'},
    {date: '2024-01-07', value: 250, formattedValue: '250', label: 'Visitors'}
];

const revenueData: GhAreaChartDataItem[] = [
    {date: '2024-01-01', value: 2400, formattedValue: '$2,400', label: 'Revenue'},
    {date: '2024-01-02', value: 1890, formattedValue: '$1,890', label: 'Revenue'},
    {date: '2024-01-03', value: 3200, formattedValue: '$3,200', label: 'Revenue'},
    {date: '2024-01-04', value: 4100, formattedValue: '$4,100', label: 'Revenue'},
    {date: '2024-01-05', value: 2800, formattedValue: '$2,800', label: 'Revenue'},
    {date: '2024-01-06', value: 5200, formattedValue: '$5,200', label: 'Revenue'},
    {date: '2024-01-07', value: 3900, formattedValue: '$3,900', label: 'Revenue'}
];

export const Default: Story = {
    args: {
        data: sampleData,
        range: 7,
        id: 'visitors-chart',
        className: 'h-[200px]'
    }
};

export const WithCustomColor: Story = {
    args: {
        data: revenueData,
        range: 7,
        color: 'hsl(var(--chart-green))',
        id: 'revenue-chart',
        className: 'h-[200px]'
    }
};

export const WithoutYAxisValues: Story = {
    args: {
        data: sampleData,
        range: 7,
        id: 'no-yaxis-chart',
        className: 'h-[200px]',
        showYAxisValues: false
    }
};

export const WithoutHorizontalLines: Story = {
    args: {
        data: sampleData,
        range: 7,
        id: 'no-grid-chart',
        className: 'h-[200px]',
        showHorizontalLines: false
    }
};

export const WithCustomYAxisRange: Story = {
    args: {
        data: sampleData,
        range: 7,
        yAxisRange: [0, 500],
        id: 'custom-range-chart',
        className: 'h-[200px]'
    }
};

export const HourlyData: Story = {
    args: {
        data: [
            {date: '2024-01-01T00:00:00', value: 45, formattedValue: '45', label: 'Page Views'},
            {date: '2024-01-01T04:00:00', value: 23, formattedValue: '23', label: 'Page Views'},
            {date: '2024-01-01T08:00:00', value: 67, formattedValue: '67', label: 'Page Views'},
            {date: '2024-01-01T12:00:00', value: 89, formattedValue: '89', label: 'Page Views'},
            {date: '2024-01-01T16:00:00', value: 156, formattedValue: '156', label: 'Page Views'},
            {date: '2024-01-01T20:00:00', value: 134, formattedValue: '134', label: 'Page Views'}
        ],
        range: 1,
        id: 'hourly-chart',
        className: 'h-[200px]',
        showHours: true
    }
};
