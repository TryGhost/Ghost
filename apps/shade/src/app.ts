// App shell/provider/context and transitional domain utilities
export {default as ShadeApp} from '@/shade-app';
export type {ShadeAppProps} from '@/shade-app';
export {useFocusContext} from '@/providers/shade-provider';

export {
    formatUrl,
    isValidDomain,
    formatQueryDate,
    getRangeDates,
    getRangeForStartDate,
    formatDisplayDateWithRange,
    centsToDollars,
    sanitizeChartData,
    getYRange,
    getYRangeWithMinPadding,
    getYRangeWithLargePadding,
    calculateYAxisWidth,
    formatMemberName,
    getMemberInitials
} from './lib/app-utils';
