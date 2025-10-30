// UI components —  Basic building blocks (buttons, inputs, dialogs)
export * from './components/ui/alert-dialog';
export * from './components/ui/animated-number';
export * from './components/ui/avatar';
export * from './components/ui/badge';
export * from './components/ui/banner';
export * from './components/ui/breadcrumb';
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/chart';
export * from './components/ui/data-list';
export * from './components/ui/dialog';
export * from './components/ui/dropdown-menu';
export * from './components/ui/empty-indicator';
export * from './components/ui/field';
export * from './components/ui/flag';
export * from './components/ui/form';
export * from './components/ui/gh-chart';
export * from './components/ui/hover-card';
export * from './components/ui/input';
export * from './components/ui/input-group';
export * from './components/ui/kbd';
export * from './components/ui/label';
export * from './components/ui/loading-indicator';
export * from './components/ui/navbar';
export * from './components/ui/no-value-label';
export * from './components/ui/pagemenu';
export * from './components/ui/popover';
export * from './components/ui/right-sidebar';
export * from './components/ui/separator';
export * from './components/ui/select';
export * from './components/ui/simple-pagination';
export * from './components/ui/sheet';
export * from './components/ui/sidebar';
export * from './components/ui/skeleton';
export * from './components/ui/sonner';
export * from './components/ui/switch';
export * from './components/ui/table';
export * from './components/ui/tabs';
export * from './components/ui/textarea';
export * from './components/ui/toggle-group';
export * from './components/ui/tooltip';

export type {DropdownMenuCheckboxItemProps as DropdownMenuCheckboxItemProps} from '@radix-ui/react-dropdown-menu';

// Layout components (headings, pages, view headers)
export * from './components/layout/page';
export {ErrorPage} from './components/layout/error-page';
export * from './components/layout/heading';
export * from './components/layout/header';
export * from './components/layout/view-header';

// Feature components — Complete functional components (share modal, etc.)
export {default as PostShareModal} from './components/features/post_share_modal';
export * from './components/features/table-filter-tabs/table-filter-tabs';
export * from './components/features/utm-campaign-tabs/utm-campaign-tabs';
export type {CampaignType, TabType} from './components/features/utm-campaign-tabs/utm-campaign-tabs';

// Third party components
export * as Recharts from 'recharts';
export * as LucideIcon from 'lucide-react';

export {IconComponents as Icon} from './components/ui/icon';

// Assets
export {ReactComponent as FacebookLogo} from './assets/images/facebook-logo.svg';
export {ReactComponent as GhostLogo} from './assets/images/ghost-logo.svg';
export {ReactComponent as GhostOrb} from './assets/images/ghost-orb.svg';
export {ReactComponent as GoogleLogo} from './assets/images/google-logo.svg';
export {ReactComponent as TwitterLogo} from './assets/images/twitter-logo.svg';
export {ReactComponent as XLogo} from './assets/images/x-logo.svg';

// Hooks
export {default as useGlobalDirtyState} from './hooks/use-global-dirty-state';
export {useSimplePagination} from './hooks/use-simple-pagination';

// Utils
export * from '@/lib/utils';
export {cn, debounce, kebabToPascalCase, formatUrl, formatQueryDate, formatTimestamp, formatNumber, formatDuration, formatPercentage, formatDisplayDate, isValidDomain, getYRange, getYRangeWithMinPadding, getYRangeWithLargePadding, calculateYAxisWidth, getRangeDates, getCountryFlag, sanitizeChartData, formatDisplayDateWithRange, centsToDollars, getRangeForStartDate, formatMemberName, getMemberInitials, stringToHslColor, abbreviateNumber} from '@/lib/utils';

export {default as ShadeApp} from './ShadeApp';
export type {ShadeAppProps} from './ShadeApp';
export {useFocusContext} from './providers/ShadeProvider';
