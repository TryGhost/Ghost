import type {ComponentProps} from 'react';
import {lazy, Suspense} from 'react';

// Dynamically import the NumberFlow component
const NumberFlow = lazy(() => import('@number-flow/react'));

// Create a wrapper that preserves the original functionality
const AnimatedNumber = (props: ComponentProps<typeof NumberFlow>) => {
    return (
        <Suspense fallback={<div></div>}>
            <NumberFlow {...props} />
        </Suspense>
    );
};

// Export the component
export {AnimatedNumber};
