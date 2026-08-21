// App shell/provider/context and transitional domain utilities
export {default as ShadeApp} from '@/shade-app';
export type {ShadeAppProps} from '@/shade-app';
export {useFocusContext} from '@/providers/shade-provider';
export type {FetchKoenigLexical} from '@/providers/shade-provider';

export {
    formatQueryDate,
    getRangeDates,
    getRangeForStartDate,
    formatDisplayDateWithRange,
    centsToDollars,
    getYRange,
    calculateYAxisWidth,
    formatMemberName,
    getMemberInitials
} from './lib/app-utils';
