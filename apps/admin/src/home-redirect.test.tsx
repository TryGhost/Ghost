import {render, waitFor} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {HomeRedirect} from './home-redirect';

const {mockNavigate, mockStartChecklist, mockUseCurrentUser, mockUseSearchParams} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockStartChecklist: vi.fn(),
    mockUseCurrentUser: vi.fn(),
    mockUseSearchParams: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({replace, to}: {replace?: boolean; to: string}) => React.createElement('div', {
        'data-replace': String(Boolean(replace)),
        'data-testid': 'navigate',
        'data-to': to
    }),
    useNavigate: () => mockNavigate,
    useSearchParams: mockUseSearchParams
}));

// spread the real module: api/users imports usersDataType from it and is
// deliberately left unmocked so the role helpers exercise their real logic
vi.mock('@tryghost/admin-x-framework/api/current-user', async importOriginal => ({
    ...await importOriginal<object>(),
    useCurrentUser: mockUseCurrentUser
}));

vi.mock('@/onboarding/hooks/use-onboarding', () => ({
    useOnboarding: () => ({startChecklist: mockStartChecklist})
}));

function mockUser(roleName: string) {
    mockUseCurrentUser.mockReturnValue({
        data: {
            id: '1',
            roles: [{name: roleName}]
        },
        isError: false,
        isLoading: false
    });
}

describe('HomeRedirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSearchParams.mockReturnValue([new URLSearchParams()]);
        mockStartChecklist.mockResolvedValue(undefined);
        mockUser('Owner');
    });

    it('renders nothing while the current user is still loading', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined,
            isError: false,
            isLoading: true
        });

        const {container} = render(<HomeRedirect />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the current user is unavailable after loading', () => {
        // signed out: the hidden Ember app rewrites the URL to the signin
        // screen, so the component must not redirect anywhere itself
        mockUseCurrentUser.mockReturnValue({
            data: undefined,
            isError: true,
            isLoading: false
        });

        const {container} = render(<HomeRedirect />);

        expect(container).toBeEmptyDOMElement();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each([
        ['Owner', '/analytics'],
        ['Administrator', '/analytics'],
        ['Editor', '/site'],
        ['Super Editor', '/site'],
        ['Author', '/site'],
        ['Contributor', '/posts']
    ])('redirects %s to %s', (roleName, expectedPath) => {
        mockUser(roleName);
        window.location.hash = '#/';

        render(<HomeRedirect />);

        expect(mockNavigate).toHaveBeenCalledWith(expectedPath, {replace: true});
        window.location.hash = '';
    });

    it('does not redirect when the URL has already moved on', () => {
        // a navigation right after landing on "/" must not be clobbered by
        // the late role redirect (Ember's redirect ran synchronously inside
        // the route transition; the React effect fires after commit)
        mockUser('Owner');
        window.location.hash = '#/settings/staff';

        render(<HomeRedirect />);

        expect(mockNavigate).not.toHaveBeenCalled();
        window.location.hash = '';
    });

    describe('?firstStart=true', () => {
        beforeEach(() => {
            mockUseSearchParams.mockReturnValue([new URLSearchParams('firstStart=true')]);
        });

        it('starts the checklist for owners before redirecting to onboarding', async () => {
            mockUser('Owner');

            const {container} = render(<HomeRedirect />);

            expect(container).toBeEmptyDOMElement();

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/setup/onboarding?returnTo=/analytics', {replace: true});
            });
            expect(mockStartChecklist).toHaveBeenCalledOnce();
        });

        it('redirects non-owners to onboarding without starting the checklist', async () => {
            mockUser('Administrator');

            render(<HomeRedirect />);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/setup/onboarding?returnTo=/analytics', {replace: true});
            });
            expect(mockStartChecklist).not.toHaveBeenCalled();
        });

        it('still redirects when starting the checklist fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            mockStartChecklist.mockRejectedValue(new Error('failed'));
            mockUser('Owner');

            render(<HomeRedirect />);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/setup/onboarding?returnTo=/analytics', {replace: true});
            });
        });

        it('does nothing while the current user is still loading', () => {
            mockUseCurrentUser.mockReturnValue({
                data: undefined,
                isError: false,
                isLoading: true
            });

            const {container} = render(<HomeRedirect />);

            expect(container).toBeEmptyDOMElement();
            expect(mockStartChecklist).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});
