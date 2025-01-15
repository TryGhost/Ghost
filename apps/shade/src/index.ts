// UI components
export {IconComponents as Icon} from './components/ui/Icon';
export * from './components/ui/Badge';
export * from './components/ui/Breadcrumb';
export * from './components/ui/Button';
export * from './components/ui/Card';
export * from './components/ui/Chart';
export * from './components/ui/DropdownMenu';
export * from './components/ui/Separator';
export * from './components/ui/Tabs';

// Global layout components
export * from './components/layout/Page';
export * from './components/layout/Heading';

// Additional components
export * from 'recharts';

// Assets
export {ReactComponent as FacebookLogo} from './assets/images/facebook-logo.svg';
export {ReactComponent as GhostLogo} from './assets/images/ghost-logo.svg';
export {ReactComponent as GhostOrb} from './assets/images/ghost-orb.svg';
export {ReactComponent as GoogleLogo} from './assets/images/google-logo.svg';
export {ReactComponent as TwitterLogo} from './assets/images/twitter-logo.svg';
export {ReactComponent as XLogo} from './assets/images/x-logo.svg';

export {default as useGlobalDirtyState} from './hooks/useGlobalDirtyState';

// Utils
export {cn} from '@/lib/utils';
export * from '@/lib/utils';
export {debounce} from './utils/debounce';
export {formatUrl} from './utils/formatUrl';

export {default as ShadeApp} from './ShadeApp';
export type {ShadeAppProps} from './ShadeApp';
export {useFocusContext} from './providers/ShadeProvider';
