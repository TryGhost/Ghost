/**
 * Shared Runtime for Public Apps
 *
 * Provides common utilities used across all features:
 * - React singleton (single React instance)
 * - Ghost API utilities
 * - i18n wrapper
 * - Frame/Shadow DOM utilities
 */

export {React, ReactDOM, createRoot} from './react-singleton';
export {GhostApi, createApi} from './api';
