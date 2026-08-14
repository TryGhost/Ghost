import * as Sentry from '@sentry/react';
import React, {type ComponentType, type ErrorInfo, type ReactNode} from 'react';
import {Banner} from '@tryghost/shade/components';

export interface ErrorBoundaryProps {
    children: ReactNode;
    name: ReactNode;
}

/**
 * Catches errors in child components and displays a banner. Useful to prevent errors in one
 * section from crashing the entire page
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
    state = {hasError: false};

    constructor(props: {children: ReactNode, name: ReactNode}) {
        super(props);
    }

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    componentDidCatch(error: unknown, info: ErrorInfo) {
        Sentry.withScope((scope) => {
            scope.setTag('adminx_settings_component', info.componentStack);
            Sentry.captureException(error);
        });
        // eslint-disable-next-line no-console
        console.error(error);
        // eslint-disable-next-line no-console
        console.error('In component:', info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Banner className='border border-state-danger/40 bg-state-danger/10 text-destructive' role='alert' size='sm' variant='destructive'>
                    An error occurred loading {this.props.name}. Please refresh and try again.
                </Banner>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

export const withErrorBoundary = <Props extends Record<string, unknown>>(Component: ComponentType<Props>, name: string) => {
    return function WithErrorBoundary(props: Props) {
        return (
            <ErrorBoundary name={name}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
};
