import {ChartConfig} from '@tryghost/shade';

export const GROWTH_TAB_CONFIG = {
    'total-members': {
        color: 'hsl(var(--chart-darkblue))'
    },
    'free-members': {
        color: 'hsl(var(--chart-blue))'
    },
    'paid-members': {
        color: 'hsl(var(--chart-purple))'
    },
    mrr: {
        color: 'hsl(var(--chart-teal))'
    }
} as const;

export const PAID_CHANGE_CHART_CONFIG = {
    new: {
        label: 'New',
        color: 'hsl(var(--chart-teal))'
    },
    cancelled: {
        label: 'Cancelled',
        color: 'hsl(var(--chart-rose))'
    }
} satisfies ChartConfig;