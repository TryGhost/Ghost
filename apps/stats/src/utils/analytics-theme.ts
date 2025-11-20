/**
 * Theme utilities for Ghost Analytics components
 * Provides consistent dark mode support across analytics interface
 * 
 * Usage:
 * - getAnalyticsButtonClasses('ghost') for buttons
 * - getAnalyticsTextClasses('secondary') for text
 * - getAnalyticsBackgroundClasses('loading') for backgrounds
 */

export type AnalyticsButtonVariant = 'ghost' | 'outline' | 'dropdown' | 'filter';
export type AnalyticsTextVariant = 'primary' | 'secondary' | 'muted' | 'metric';
export type AnalyticsBackgroundVariant = 'loading' | 'card' | 'overlay' | 'empty';

/**
 * Get consistent button classes with proper dark mode support
 */
export const getAnalyticsButtonClasses = (variant: AnalyticsButtonVariant): string => {
    const variants = {
        ghost: 'hover:bg-gray-200 dark:hover:bg-gray-700',
        outline: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
        dropdown: 'hover:bg-gray-100 dark:hover:bg-gray-800',
        filter: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    };
    
    return variants[variant] || '';
};

/**
 * Get consistent text classes with proper dark mode support
 */
export const getAnalyticsTextClasses = (variant: AnalyticsTextVariant): string => {
    const variants = {
        primary: 'text-gray-900 dark:text-gray-100',
        secondary: 'text-gray-700 dark:text-gray-300',
        muted: 'text-gray-500 dark:text-gray-400',
        metric: 'text-gray-800 dark:text-gray-200 font-mono'
    };
    
    return variants[variant] || '';
};

/**
 * Get consistent background classes with proper dark mode support
 */
export const getAnalyticsBackgroundClasses = (variant: AnalyticsBackgroundVariant): string => {
    const variants = {
        loading: 'bg-gray-200 dark:bg-gray-700',
        card: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
        overlay: 'bg-gray-50 dark:bg-gray-950',
        empty: 'bg-gray-100 dark:bg-gray-950'
    };
    
    return variants[variant] || '';
};

/**
 * Get complete theme classes for complex components
 */
export const getAnalyticsThemeClasses = (config: {
    button?: AnalyticsButtonVariant;
    text?: AnalyticsTextVariant;
    background?: AnalyticsBackgroundVariant;
    additionalClasses?: string;
}): string => {
    const classes: string[] = [];
    
    if (config.button) {
        classes.push(getAnalyticsButtonClasses(config.button));
    }
    
    if (config.text) {
        classes.push(getAnalyticsTextClasses(config.text));
    }
    
    if (config.background) {
        classes.push(getAnalyticsBackgroundClasses(config.background));
    }
    
    if (config.additionalClasses) {
        classes.push(config.additionalClasses);
    }
    
    return classes.join(' ');
};