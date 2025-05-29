import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '@src/hooks/withFeatureFlag';

// Mock the dependencies
vi.mock('@src/hooks/useFeatureFlag');
vi.mock('@src/views/Stats/layout/StatsLayout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="stats-layout">{children}</div>
}));
vi.mock('@src/views/Stats/layout/StatsView', () => ({
    default: ({children, isLoading}: {children: React.ReactNode; isLoading: boolean}) => (
        <div data-loading={isLoading} data-testid="stats-view">{children}</div>
    )
}));
vi.mock('@tryghost/shade', () => ({
    H1: ({children}: {children: React.ReactNode}) => <h1>{children}</h1>,
    ViewHeader: ({children}: {children: React.ReactNode}) => <div data-testid="view-header">{children}</div>
}));

const mockUseFeatureFlag = vi.mocked(await import('@src/hooks/useFeatureFlag')).useFeatureFlag;

// Test component
const TestComponent = ({message}: {message: string}) => <div data-testid="test-component">{message}</div>;

describe('withFeatureFlag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the wrapped component when feature flag is enabled', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('test-component')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders loading state when feature flag is loading', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: true,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('stats-layout')).toBeInTheDocument();
        expect(screen.getByTestId('view-header')).toBeInTheDocument();
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByTestId('stats-view')).toHaveAttribute('data-loading', 'true');
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('renders redirect component when feature flag is disabled', () => {
        const mockRedirect = <div data-testid="redirect">Redirecting...</div>;
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            redirect: mockRedirect
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('redirect')).toBeInTheDocument();
        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('passes props correctly to the wrapped component', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Custom Message" />);

        expect(screen.getByText('Custom Message')).toBeInTheDocument();
    });

    it('sets correct display name for the wrapped component', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)');
    });

    it('handles component without display name', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        const AnonymousComponent = () => <div>Anonymous</div>;
        const WrappedComponent = withFeatureFlag(AnonymousComponent, 'testFlag', '/fallback', 'Test Title');
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(AnonymousComponent)');
    });
}); 