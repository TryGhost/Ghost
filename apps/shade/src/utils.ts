// DS-safe utilities, generic hooks, and third-party namespaces
export * as Recharts from 'recharts';
export * as LucideIcon from 'lucide-react';

export { default as useGlobalDirtyState } from './hooks/use-global-dirty-state';
export { useSimplePagination } from './hooks/use-simple-pagination';
export { useIsMobile } from './hooks/use-mobile';

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
