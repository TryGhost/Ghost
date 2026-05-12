// @vitest-environment jsdom

import {fireEvent, render, screen} from '@testing-library/react';
import {SidebarProvider} from '@tryghost/shade/components';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import NavContent from './nav-content';

const {mockIsMediaActive, mockSetMediaExpanded, mockUseLocation} = vi.hoisted(() => ({
    mockIsMediaActive: {
        value: true
    },
    mockSetMediaExpanded: vi.fn(),
    mockUseLocation: vi.fn(() => ({pathname: '/media', search: ''}))
}));

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tryghost/admin-x-framework')>();

    return {
        ...actual,
        useLocation: mockUseLocation
    };
});

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: () => ({
        data: {
            id: 'user-id',
            roles: []
        }
    })
}));

vi.mock('@tryghost/admin-x-framework/api/media', () => ({
    useBrowseMediaFolders: () => ({
        data: {
            media_folders: [{
                id: 'folder-id',
                name: 'Brand',
                slug: 'brand',
                created_by: null,
                created_at: '2026-05-01T00:00:00.000Z',
                updated_at: '2026-05-01T00:00:00.000Z'
            }]
        }
    })
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    canManageMedia: () => true,
    canManageMembers: () => false,
    canManageTags: () => false
}));

vi.mock('./hooks/use-member-count', () => ({
    useMemberCount: () => null
}));

vi.mock('./hooks/use-navigation-preferences', () => ({
    useNavigationExpanded: (key: string) => [key === 'media', key === 'media' ? mockSetMediaExpanded : vi.fn()]
}));

vi.mock('./member-sidebar-views', () => ({
    useMemberSidebarViews: () => []
}));

vi.mock('./use-custom-sidebar-views', () => ({
    useCustomSidebarViews: () => []
}));

vi.mock('./use-is-active-link', () => ({
    useIsActiveLink: ({path}: {path?: string}) => path === 'media' && mockIsMediaActive.value
}));

vi.mock('@/ember-bridge', () => ({
    useEmberRouting: () => ({
        getRouteUrl: (route: string) => route,
        isRouteActive: () => false
    })
}));

vi.mock('@/hooks/use-feature-flag', () => ({
    useFeatureFlag: () => false
}));

describe('NavContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsMediaActive.value = true;
        mockUseLocation.mockReturnValue({pathname: '/media', search: ''});
    });

    it('renders media folders as subitems under Media', () => {
        mockUseLocation.mockReturnValue({pathname: '/media/brand', search: ''});

        render(
            <SidebarProvider>
                <NavContent />
            </SidebarProvider>
        );

        expect(screen.getByRole('link', {name: 'Media'})).toHaveAttribute('href', '#/media');
        expect(screen.getByRole('link', {name: 'Brand'})).toHaveAttribute('href', '#/media/brand');
        expect(screen.getByRole('link', {name: 'Brand'})).toHaveAttribute('aria-current', 'page');

        fireEvent.click(screen.getByRole('button', {name: 'Toggle media folders'}));

        expect(mockSetMediaExpanded).toHaveBeenCalledWith(false);
    });

    it('collapses media folders when the media route is not active', () => {
        mockIsMediaActive.value = false;
        mockUseLocation.mockReturnValue({pathname: '/settings', search: ''});

        render(
            <SidebarProvider>
                <NavContent />
            </SidebarProvider>
        );

        expect(screen.getByRole('button', {name: 'Toggle media folders'})).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('link', {name: 'Brand'})).not.toBeInTheDocument();
    });
});
