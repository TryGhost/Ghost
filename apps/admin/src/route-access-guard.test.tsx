import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RouteAccessGuard} from './route-access-guard';

const {mockUseCurrentUser, mockUseMatches} = vi.hoisted(() => ({
    mockUseCurrentUser: vi.fn(),
    mockUseMatches: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    Outlet: () => React.createElement('div', {'data-testid': 'outlet'}),
    Navigate: ({crossApp, replace, to}: {crossApp?: boolean; replace?: boolean; to: string}) => React.createElement('div', {
        'data-cross-app': String(Boolean(crossApp)),
        'data-replace': String(Boolean(replace)),
        'data-testid': 'navigate',
        'data-to': to
    }),
    useLocation: () => ({pathname: '/tags'}),
    useMatches: mockUseMatches
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mockUseCurrentUser
}));

const allow = () => true;
const deny = () => false;

describe('RouteAccessGuard', () => {
    beforeEach(() => {
        mockUseMatches.mockReturnValue([{handle: {requiresAccess: allow}}]);
        mockUseCurrentUser.mockReturnValue({
            data: {slug: 'jo', roles: [{name: 'Administrator'}]},
            isError: false,
            isLoading: false
        });
    });

    it('renders the route when every matched rule passes', () => {
        mockUseMatches.mockReturnValue([{handle: {requiresAccess: allow}}, {handle: {requiresAccess: allow}}]);

        render(<RouteAccessGuard />);

        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('redirects to the default view when a rule fails', () => {
        mockUseMatches.mockReturnValue([{handle: {requiresAccess: allow}}, {handle: {requiresAccess: deny}}]);

        render(<RouteAccessGuard />);

        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-cross-app', 'false');
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });

    it('renders unguarded routes without waiting for the current user', () => {
        mockUseMatches.mockReturnValue([{handle: undefined}, {handle: {hideAdminSidebar: true}}]);
        mockUseCurrentUser.mockReturnValue({data: undefined, isError: false, isLoading: true});

        render(<RouteAccessGuard />);

        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('renders nothing while the current user is still loading', () => {
        mockUseCurrentUser.mockReturnValue({data: undefined, isError: false, isLoading: true});

        const {container} = render(<RouteAccessGuard />);

        expect(container).toBeEmptyDOMElement();
    });

    it('redirects when the current user cannot be loaded', () => {
        mockUseCurrentUser.mockReturnValue({data: undefined, isError: true, isLoading: false});

        render(<RouteAccessGuard />);

        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });
});
