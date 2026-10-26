// DS-safe utilities, generic hooks, and third-party namespaces
export * as Recharts from 'recharts';
export * as LucideIcon from 'lucide-react';

export { default as useGlobalDirtyState } from './hooks/use-global-dirty-state';
export { useSimplePagination } from './hooks/use-simple-pagination';
export { useIsMobile } from './hooks/use-mobile';
// ANALYTICS PROTOTYPE: milestone switch read from a root attribute
export { useRootFlag } from './hooks/use-root-flag';

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
  formatDisplayDateWithRange,
  getCountryFlag,
  stringToHslColor,
  abbreviateNumber,
  getYRange,
  calculateYAxisWidth,
} from './lib/ds-utils';
