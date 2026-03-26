import type {ComponentType, LazyExoticComponent} from 'react';
import {lazy, Suspense} from 'react';
import type {NumberFlowProps} from '@number-flow/react';

// Dynamically import the NumberFlow component
const NumberFlow: LazyExoticComponent<ComponentType<NumberFlowProps>> = lazy(async () => {
    const module = await import('@number-flow/react');

    return {
        default: module.default as ComponentType<NumberFlowProps>
    };
});

// Create a wrapper that preserves the original functionality
const AnimatedNumber = (props: NumberFlowProps) => {
    return (
        <Suspense fallback={<div></div>}>
            <NumberFlow {...props} />
        </Suspense>
    );
};

// Export the component
export {AnimatedNumber};
