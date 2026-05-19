import type {ComponentPropsWithoutRef, LazyExoticComponent} from 'react';
import {lazy, Suspense} from 'react';

type NumberFlowComponent = typeof import('@number-flow/react').default;
type AnimatedNumberProps = ComponentPropsWithoutRef<NumberFlowComponent>;

// Dynamically import the NumberFlow component
const NumberFlow: LazyExoticComponent<NumberFlowComponent> = lazy(() => import('@number-flow/react'));

// Create a wrapper that preserves the original functionality
const AnimatedNumber = (props: AnimatedNumberProps) => {
    return (
        <Suspense fallback={<div></div>}>
            <NumberFlow {...props} />
        </Suspense>
    );
};

// Export the component
export {AnimatedNumber};
