import {type MockedFunction, vi} from 'vitest';
import {type ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '../../../src/hooks/withFeatureFlag';

// Mock the useFeatureFlag hook
vi.mock('../../../src/hooks/useFeatureFlag', () => ({
    useFeatureFlag: vi.fn()
}));

// Mock the Shade components
vi.mock('@tryghost/shade', () => ({
    H1: function H1({children}: {children: ReactNode}) {
        return <h1 data-testid="h1">{children}</h1>;
    },
    ViewHeader: function ViewHeader({children}: {children: ReactNode}) {
        return <div data-testid="view-header">{children}</div>;
    }
}));

// Mock the Stats layout components
vi.mock('@src/views/Stats/layout/StatsLayout', () => ({
    default: function StatsLayout({children}: {children: ReactNode}) {
        return <div data-testid="stats-layout">{children}</div>;
    }
}));

vi.mock('@src/views/Stats/layout/StatsView', () => ({
    default: function StatsView({children}: {children: ReactNode}) {
        return <div data-testid="stats-view">{children}</div>;
    }
}));

import {useFeatureFlag} from '../../../src/hooks/useFeatureFlag';

// Create test component with explicit displayName
const TestComponent = function TestComponent() {
    return <div data-testid="test-component">Test Content</div>;
};
TestComponent.displayName = 'TestComponent'; // Explicitly set displayName

// Create wrapped component outside describe block
const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');

describe('withFeatureFlag', function () {
    const mockUseFeatureFlag = useFeatureFlag as MockedFunction<typeof useFeatureFlag>;
    
    beforeEach(function () {
        vi.resetAllMocks();
    });

    it('renders redirect when redirect is available', function () {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            redirect: <div data-testid="redirect">Redirect Component</div>
        });

        render(<WrappedComponent />);

        expect(screen.getByTestId('redirect')).toBeInTheDocument();
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('renders loading state when isLoading is true', function () {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: false,
            isLoading: true,
            redirect: null
        });

        render(<WrappedComponent />);

        expect(screen.getByTestId('stats-layout')).toBeInTheDocument();
        expect(screen.getByTestId('h1')).toBeInTheDocument();
        expect(screen.getByTestId('h1')).toHaveTextContent('Test Title');
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('renders the wrapped component when feature is enabled', function () {
        mockUseFeatureFlag.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });

        render(<WrappedComponent />);

        expect(screen.getByTestId('test-component')).toBeInTheDocument();
        expect(screen.queryByTestId('stats-layout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('h1')).not.toBeInTheDocument();
    });

    it('sets proper displayName on wrapped component', function () {
        // Now we can expect the HOC to use our explicit displayName
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)');
    });
}); 