import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '@/posts/analytics/hooks/with-feature-flag';

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to}, `Redirecting to ${to}`)
}));

vi.mock('@/shared/analytics/use-analytics-data', () => ({
    useAnalyticsData: vi.fn()
}));

const mockUseAnalyticsData = vi.mocked(await import('@/shared/analytics/use-analytics-data')).useAnalyticsData;

describe('withFeatureFlag', () => {
    const TestComponent = ({message}: {message: string}) => <div data-testid="test-component">{message}</div>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the wrapped component and forwards props when enabled', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: false,
            config: {labs: {testFlag: true}}
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('test-component')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders redirect when disabled', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: false,
            config: {labs: {testFlag: false}}
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/fallback');
    });

    it('renders loading UI with title while loading', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: true,
            config: undefined
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('sets display name from wrapped component', () => {
        const Named = withFeatureFlag(TestComponent, 'flag', '/', 'Title');
        expect(Named.displayName).toBe('withFeatureFlag(TestComponent)');

        const Anonymous = withFeatureFlag(({text}: {text: string}) => <div>{text}</div>, 'flag', '/', 'Title');
        expect(Anonymous.displayName).toBe('withFeatureFlag(Component)');
    });
});
