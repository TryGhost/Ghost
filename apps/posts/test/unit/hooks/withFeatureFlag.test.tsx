/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '@src/hooks/withFeatureFlag';

// Mock the dependencies
vi.mock('@src/hooks/useFeatureFlag');

const mockUseFeatureFlag = vi.mocked(await import('@src/hooks/useFeatureFlag')).useFeatureFlag;

describe('withFeatureFlag', () => {
    const TestComponent = ({message}: {message: string}) => <div data-testid="test-component">{message}</div>;

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

    it('renders redirect component when feature flag is disabled', () => {
        const MockRedirect = () => <div data-testid="redirect">Redirecting...</div>;
        
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            redirect: <MockRedirect />
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />);

        expect(screen.getByTestId('redirect')).toBeInTheDocument();
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('renders loading state when feature flag is loading', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: true,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />);

        // Just check that the test component is not rendered during loading
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('passes through props to the wrapped component', () => {
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
        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)');
    });

    it('calls useFeatureFlag with correct parameters', () => {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'myFlag', '/my-fallback', 'My Title');
        
        render(<WrappedComponent message="test" />);

        expect(mockUseFeatureFlag).toHaveBeenCalledWith('myFlag', '/my-fallback');
    });
}); 