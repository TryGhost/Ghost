// DS-safe utilities, generic hooks, and third-party namespaces
export * as Recharts from 'recharts';
export * as LucideIcon from 'lucide-react';

export {default as useGlobalDirtyState} from './hooks/use-global-dirty-state';
export {useSimplePagination} from './hooks/use-simple-pagination';

export {getFormButtonProps} from './lib/form-button-props';
export type {FormButtonProps} from './lib/form-button-props';

export {
    cn,
    debounce,
    getScrollParent,
    kebabToPascalCase,
    formatTimestamp,
    formatNumber,
    formatDuration,
    formatPercentage,
    formatDisplayDate,
    formatDisplayTime,
    getCountryFlag,
    stringToHslColor,
    abbreviateNumber
} from './lib/ds-utils';
