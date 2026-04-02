import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MembersRouteGate} from './members-route-gate';

const {mockUseLocation, mockUseFeatureFlag} = vi.hoisted(() => ({
    mockUseLocation: vi.fn(),
    mockUseFeatureFlag: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    Outlet: () => React.createElement('div', {'data-testid': 'outlet'}),
    useLocation: mockUseLocation
}));

vi.mock('./ember-bridge', () => ({
    EmberFallback: () => React.createElement('div', {'data-testid': 'ember-fallback'})
}));

vi.mock('./hooks/use-feature-flag', () => ({
    useFeatureFlag: mockUseFeatureFlag
}));

describe('MembersRouteGate', () => {
    beforeEach(() => {
        mockUseFeatureFlag.mockReturnValue(false);
        mockUseLocation.mockReturnValue({pathname: '/members'});
    });

    it('delegates /members/ to Ember when the flag is disabled', () => {
        mockUseLocation.mockReturnValue({pathname: '/members/'});

        render(<MembersRouteGate />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('keeps /members/import on React even when the flag is disabled', () => {
        mockUseLocation.mockReturnValue({pathname: '/members/import'});

        render(<MembersRouteGate />);

        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });
});
