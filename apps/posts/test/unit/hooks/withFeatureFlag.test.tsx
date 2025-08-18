/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, setupUniversalMocks} from '../../utils/test-helpers';
import {render, screen} from '@testing-library/react';
import {withFeatureFlag} from '@src/hooks/withFeatureFlag';

// Mock the Navigate component
vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to}, `Redirecting to ${to}`)
}));

// Centralized API mocking
vi.mock('@tryghost/admin-x-framework/api/posts');
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@tryghost/admin-x-framework/api/links');
vi.mock('@src/providers/PostAnalyticsContext');
vi.mock('@tryghost/admin-x-framework/api/settings');

describe('withFeatureFlag', () => {
    const TestComponent = ({message}: {message: string}) => <div data-testid="test-component">{message}</div>;
    let wrapper: any;
    let mocks: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        wrapper = createTestWrapper();
        
        // Universal setup - mocks ALL API hooks with sensible defaults
        mocks = await setupUniversalMocks();
    });

    it('renders the wrapped component when feature flag is enabled', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"testFlag": true}');
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"testFlag": true}'}
            ]
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />, {wrapper});

        expect(screen.getByTestId('test-component')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('prevents access when feature flag is disabled', () => {
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"testFlag": false}'}
            ]
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />, {wrapper});

        // Component should not render when feature is disabled
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
    });

    it('prevents access when feature flag is missing', () => {
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"otherFlag": true}'}
            ]
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />, {wrapper});

        // Component should not render when feature flag doesn't exist
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
    });

    it('shows loading state during data loading', () => {
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: true,
            settings: []
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        render(<WrappedComponent message="Hello World" />, {wrapper});

        // Component should not render during loading, should show title
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('passes through props to the wrapped component', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"analytics": true}');
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"analytics": true}'}
            ]
        });

        const WrappedComponent = withFeatureFlag(TestComponent, 'analytics', '/dashboard', 'Analytics');
        
        render(<WrappedComponent message="Custom Message" />, {wrapper});

        expect(screen.getByText('Custom Message')).toBeInTheDocument();
    });

    it('sets correct display name for the wrapped component', () => {
        const WrappedComponent = withFeatureFlag(TestComponent, 'testFlag', '/fallback', 'Test Title');
        
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)');
    });

    it('works with different feature flags', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"customFeature": true, "otherFeature": false}');
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"customFeature": true, "otherFeature": false}'}
            ]
        });

        const CustomWrapped = withFeatureFlag(TestComponent, 'customFeature', '/home', 'Custom Feature');
        const OtherWrapped = withFeatureFlag(TestComponent, 'otherFeature', '/home', 'Other Feature');
        
        render(
            <div>
                <CustomWrapped message="Custom Feature Active" />
                <OtherWrapped message="Other Feature Active" />
            </div>,
            {wrapper}
        );

        // Only the enabled feature should render, disabled shows redirect
        expect(screen.getByText('Custom Feature Active')).toBeInTheDocument();
        expect(screen.getByText('Redirecting to /home')).toBeInTheDocument();
        expect(screen.queryByText('Other Feature Active')).not.toBeInTheDocument();
    });

    it('handles complex feature flag scenarios', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"analytics": true, "webAnalytics": false, "trafficAnalytics": true}');
        mocks.mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: [
                {key: 'labs', value: '{"analytics": true, "webAnalytics": false, "trafficAnalytics": true}'}
            ]
        });

        const AnalyticsComponent = withFeatureFlag(TestComponent, 'analytics', '/dashboard', 'Analytics');
        const WebAnalyticsComponent = withFeatureFlag(TestComponent, 'webAnalytics', '/dashboard', 'Web Analytics');
        const TrafficComponent = withFeatureFlag(TestComponent, 'trafficAnalytics', '/dashboard', 'Traffic');
        
        render(
            <div>
                <AnalyticsComponent message="Analytics Enabled" />
                <WebAnalyticsComponent message="Web Analytics Enabled" />
                <TrafficComponent message="Traffic Enabled" />
            </div>,
            {wrapper}
        );

        // Only enabled features should render, disabled shows redirect
        expect(screen.getByText('Analytics Enabled')).toBeInTheDocument();
        expect(screen.getByText('Traffic Enabled')).toBeInTheDocument();
        expect(screen.getByText('Redirecting to /dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Web Analytics Enabled')).not.toBeInTheDocument();
    });

    it('works with components that have no display name', () => {
        const AnonymousComponent = ({text}: {text: string}) => <div>{text}</div>;
        
        const WrappedComponent = withFeatureFlag(AnonymousComponent, 'testFlag', '/fallback', 'Test');
        
        expect(WrappedComponent.displayName).toBe('withFeatureFlag(AnonymousComponent)');
    });
});