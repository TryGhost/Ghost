/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '@src/hooks/with-feature-flag';

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to}, `Redirecting to ${to}`)
}));

vi.mock('@src/providers/post-analytics-context');

describe('withFeatureFlag', () => {
    const TestComponent = ({message}: {message: string}) => <div data-testid="test-component">{message}</div>;
    let mockUseGlobalData: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockUseGlobalData = vi.mocked(await import('@src/providers/post-analytics-context')).useGlobalData;
    });

    it('renders the wrapped component and forwards props when enabled', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: true}}
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('test-component')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders redirect when disabled', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: false}}
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        render(<WrappedComponent message="Hello World" />);

        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/fallback');
    });

    it('renders loading UI with title while loading', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: true,
            data: undefined
        });

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
