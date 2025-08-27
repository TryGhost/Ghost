import React, {ReactElement, ReactNode} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, renderHook, RenderOptions, RenderHookOptions, RenderResult} from '@testing-library/react';
import {FrameworkProvider, TopLevelFrameworkProps} from '../providers/FrameworkProvider';

/**
 * Creates a test QueryClient with sensible defaults for testing
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                suspense: false,
                // Disable cache time for tests to avoid stale data
                cacheTime: 0,
                staleTime: 0
            },
            mutations: {
                retry: false
            }
        },
        // Disable logging in tests
        logger: {
            log: () => {},
            warn: () => {},
            error: () => {}
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
 * Enhanced render function that wraps components with common providers
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    frameworkProps?: Partial<TopLevelFrameworkProps>;
    queryClient?: QueryClient;
    wrapper?: React.ComponentType<{children: ReactNode}>;
}

export function renderWithProviders(
    ui: ReactElement,
    options: CustomRenderOptions = {}
): RenderResult {
    const {frameworkProps, queryClient, wrapper: CustomWrapper, ...renderOptions} = options;

    const Wrapper = CustomWrapper || (({children}: {children: ReactNode}) => (
        <TestWrapper frameworkProps={frameworkProps} queryClient={queryClient}>
            {children}
        </TestWrapper>
    ));

    return render(ui, {wrapper: Wrapper, ...renderOptions});
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

/**
 * Utility to wait for API calls to complete
 */
export async function waitForApiCall(mockFn: jest.MockedFunction<(...args: unknown[]) => unknown>, timeout = 1000) {
    const {waitFor} = await import('@testing-library/react');
    return waitFor(() => expect(mockFn).toHaveBeenCalled(), {timeout});
}

/**
 * Utility to wait for multiple API calls
 */
export async function waitForApiCalls(mockFn: jest.MockedFunction<(...args: unknown[]) => unknown>, count: number, timeout = 1000) {
    const {waitFor} = await import('@testing-library/react');
    return waitFor(() => expect(mockFn).toHaveBeenCalledTimes(count), {timeout});
}

/**
 * Console error filtering utility
 */
export interface ConsoleFilterOptions {
    /** Additional error messages to suppress */
    suppressMessages?: string[];
    /** Whether to suppress React warnings */
    suppressReactWarnings?: boolean;
    /** Whether to suppress chart warnings */
    suppressChartWarnings?: boolean;
}

export function setupConsoleFiltering(options: ConsoleFilterOptions = {}) {
    const {
        suppressMessages = [],
        suppressReactWarnings = true,
        suppressChartWarnings = true
    } = options;

    // eslint-disable-next-line no-console
    const originalConsoleError = console.error;

    const defaultSuppressedMessages = [
        ...(suppressReactWarnings ? [
            'Support for defaultProps will be removed',
            'Encountered two children with the same key'
        ] : []),
        ...(suppressChartWarnings ? [
            'The width(0) and height(0) of chart should be greater than 0'
        ] : []),
        ...suppressMessages
    ];

    // eslint-disable-next-line no-console
    console.error = (...args) => {
        const message = args[0]?.toString() || '';
        
        if (defaultSuppressedMessages.some(suppressedMessage => message.includes(suppressedMessage))) {
            return;
        }
        
        originalConsoleError(...args);
    };

    // Return cleanup function
    return () => {
        // eslint-disable-next-line no-console
        console.error = originalConsoleError;
    };
}

/**
 * Test data factories for common entities
 */
export const testDataFactories = {
    post: (overrides = {}) => ({
        id: 'test-post-id',
        published_at: '2024-01-01T00:00:00.000Z',
        slug: 'test-post',
        status: 'published',
        title: 'Test Post',
        url: 'https://example.com/test-post/',
        uuid: 'test-post-uuid',
        ...overrides
    }),

    member: (overrides = {}) => ({
        created_at: '2024-01-01T00:00:00.000Z',
        email: 'test@example.com',
        id: 'test-member-id',
        status: 'free',
        ...overrides
    }),

    user: (overrides = {}) => ({
        email: 'user@example.com',
        id: 'test-user-id',
        name: 'Test User',
        roles: [{name: 'Administrator'}],
        slug: 'test-user',
        ...overrides
    }),

    newsletter: (overrides = {}) => ({
        id: 'test-newsletter-id',
        name: 'Test Newsletter',
        slug: 'test-newsletter',
        status: 'active',
        ...overrides
    })
};

/**
 * Mock timer utilities
 */
export function mockTimers() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vitest = require('vitest');
    vitest.vi.useFakeTimers();
    
    return {
        advanceTime: (ms: number) => vitest.vi.advanceTimersByTime(ms),
        cleanup: () => vitest.vi.useRealTimers(),
        runAllTimers: () => vitest.vi.runAllTimers()
    };
} 