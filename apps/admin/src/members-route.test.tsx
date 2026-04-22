import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MembersRoute} from './members-route';

const {mockCanManageMembers, mockUseCurrentUser} = vi.hoisted(() => ({
    mockCanManageMembers: vi.fn(),
    mockUseCurrentUser: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    Outlet: () => React.createElement('div', {'data-testid': 'outlet'}),
    Navigate: ({replace, to}: {replace?: boolean; to: string}) => React.createElement('div', {
        'data-replace': String(Boolean(replace)),
        'data-testid': 'navigate',
        'data-to': to
    })
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mockUseCurrentUser
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    canManageMembers: mockCanManageMembers
}));

describe('MembersRoute', () => {
    beforeEach(() => {
        mockCanManageMembers.mockReturnValue(true);
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                roles: [{name: 'Administrator'}]
            },
            isError: false,
            isLoading: false
        });
    });

    it('renders the nested members routes for authorized users', () => {
        render(<MembersRoute />);

        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('redirects users without member permissions to home', () => {
        mockCanManageMembers.mockReturnValue(false);

        render(<MembersRoute />);

        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });

    it('renders nothing while the current user is still loading', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined,
            isError: false,
            isLoading: true
        });

        const {container} = render(<MembersRoute />);

        expect(container).toBeEmptyDOMElement();
    });

    it('redirects to home when the current user is unavailable after loading', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined,
            isError: false,
            isLoading: false
        });

        render(<MembersRoute />);

        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });
});
