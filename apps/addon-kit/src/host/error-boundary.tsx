import {Component, type ReactNode} from 'react';

interface AddonErrorBoundaryProps {
    fallback: ReactNode;
    children: ReactNode;
}

interface AddonErrorBoundaryState {
    hasError: boolean;
}

/**
 * Contains failures inside an add-on surface: a crashing add-on shows the
 * host-owned fallback instead of blanking the surrounding admin UI.
 */
export class AddonErrorBoundary extends Component<AddonErrorBoundaryProps, AddonErrorBoundaryState> {
    state: AddonErrorBoundaryState = {hasError: false};

    static getDerivedStateFromError(): AddonErrorBoundaryState {
        return {hasError: true};
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}
