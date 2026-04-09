// DS-safe utilities, generic hooks, and third-party namespaces
export * as Recharts from 'recharts';
export * as LucideIcon from 'lucide-react';

export {default as useGlobalDirtyState} from './hooks/use-global-dirty-state';
export {useSimplePagination} from './hooks/use-simple-pagination';

export {
    cn,
    debounce,
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
