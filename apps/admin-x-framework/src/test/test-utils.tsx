import React, {ReactNode} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {renderHook, RenderHookOptions} from '@testing-library/react';
import {FrameworkProvider, TopLevelFrameworkProps} from '../providers/framework-provider';

/**
 * Creates a test QueryClient with sensible defaults for testing
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                // Disable cache time for tests to avoid stale data
                gcTime: 0,
                staleTime: 0
            },
            mutations: {
                retry: false
            }
        }
    });
}

/**
 * Default framework props for testing
 */
export const defaultFrameworkProps: TopLevelFrameworkProps = {
    externalNavigate: () => {},
    ghostVersion: '5.x',
    onDelete: () => {},
    onInvalidate: () => {},
    onUpdate: () => {},
    sentryDSN: null,
    unsplashConfig: {
        Authorization: '',
        'Accept-Version': '',
        'Content-Type': '',
        'App-Pragma': '',
        'X-Unsplash-Cache': false
    }
};

/**
 * Test wrapper that provides QueryClient and FrameworkProvider
 */
export interface TestWrapperProps {
    children: ReactNode;
    frameworkProps?: Partial<TopLevelFrameworkProps>;
    queryClient?: QueryClient;
}

export function TestWrapper({
    children,
    frameworkProps = {},
    queryClient = createTestQueryClient()
}: TestWrapperProps) {
    const mergedFrameworkProps = {
        ...defaultFrameworkProps,
        ...frameworkProps
    };

    return (
        <FrameworkProvider {...mergedFrameworkProps}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </FrameworkProvider>
    );
}

/**
 * Enhanced renderHook function that wraps hooks with common providers
 */
export interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
    frameworkProps?: Partial<TopLevelFrameworkProps>;
    queryClient?: QueryClient;
    wrapper?: React.ComponentType<{children: ReactNode}>;
}

export function renderHookWithProviders<TResult, TProps>(
    hook: (props: TProps) => TResult,
    options: CustomRenderHookOptions<TProps> = {}
) {
    const {frameworkProps, queryClient, wrapper: CustomWrapper, ...renderHookOptions} = options;

    const Wrapper = CustomWrapper || (({children}: {children: ReactNode}) => (
        <TestWrapper frameworkProps={frameworkProps} queryClient={queryClient}>
            {children}
        </TestWrapper>
    ));

    return renderHook(hook, {wrapper: Wrapper, ...renderHookOptions});
}
