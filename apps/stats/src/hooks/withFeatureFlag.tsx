import React from 'react';
import StatsLayout from '@src/views/Stats/layout/StatsLayout';
import StatsView from '@src/views/Stats/layout/StatsView';
import {H1, ViewHeader} from '@tryghost/shade';
import {useFeatureFlag} from './useFeatureFlag';

/**
 * Higher-Order Component that wraps a component with feature flag checking
 * 
 * @param Component The component to wrap
 * @param flagName The name of the feature flag to check
 * @param fallbackPath The path to redirect to if feature flag is disabled
 * @param title The title to display in the loading state
 * @returns A new component wrapped with feature flag checking
 */
export const withFeatureFlag = <P extends object>(
    Component: React.ComponentType<P>,
    flagName: string,
    fallbackPath: string,
    title: string
) => {
    const WrappedComponent = (props: P) => {
        const {isLoading, redirect} = useFeatureFlag(flagName, fallbackPath);
        
        // If we have a redirect component, render it
        if (redirect) {
            return redirect;
        }
        
        // If we're loading, render a loading state
        if (isLoading) {
            return (
                <StatsLayout>
                    <ViewHeader className='before:hidden'>
                        <H1>{title}</H1>
                    </ViewHeader>
                    <StatsView data={[]} isLoading={true}>
                        <div>{/* Loading placeholder */}</div>
                    </StatsView>
                </StatsLayout>
            );
        }
        
        // Otherwise render the wrapped component
        return <Component {...props} />;
    };
    
    // Set display name for debugging
    WrappedComponent.displayName = `withFeatureFlag(${Component.displayName || Component.name || 'Component'})`;
    
    return WrappedComponent;
}; 