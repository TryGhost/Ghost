// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {type SharedView} from './shared-views';
import {useCustomSidebarViews} from './use-custom-sidebar-views';

interface EmberRoutingMock {
    getRouteUrl: (route: 'posts' | 'pages', filter: Record<string, string | null>) => string;
    isRouteActive: (route: 'posts' | 'pages', filter: Record<string, string | null>) => boolean;
}

const {mockUseSharedViews, mockUseEmberRouting, mockLocation} = vi.hoisted(() => ({
    mockUseSharedViews: vi.fn<(route?: string) => SharedView[]>(),
    mockUseEmberRouting: vi.fn<() => EmberRoutingMock>(),
    mockLocation: {pathname: '/posts', search: ''}
}));

vi.mock('./shared-views', () => ({
    useSharedViews: mockUseSharedViews
}));

vi.mock('./nav-saved-views', () => ({
    NavSavedViews: () => null
}));

vi.mock('@/ember-bridge', () => ({
    useEmberRouting: mockUseEmberRouting
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useLocation: () => mockLocation,
    useSearchParams: () => [new URLSearchParams(mockLocation.search), vi.fn()],
    // use-posts-view-active imports @tryghost/posts/api, whose module graph
    // calls lazyComponent at import time (routes.tsx)
    lazyComponent: () => () => null
}));

function setUrl(pathname: string, search: string) {
    mockLocation.pathname = pathname;
    mockLocation.search = search;
}

describe('useCustomSidebarViews', () => {
    beforeEach(() => {
        mockUseSharedViews.mockReturnValue([
            {
                name: 'Drafts by me',
                route: 'posts',
                color: 'green',
                filter: {type: 'draft', author: 'me'}
            }
        ]);
        mockUseEmberRouting.mockReturnValue({
            getRouteUrl: vi.fn(() => 'posts?type=draft&author=me'),
            isRouteActive: vi.fn(() => false)
        });
    });

    it('maps shared views to sidebar views, marking the matching view active from the URL', () => {
        setUrl('/posts', '?type=draft&author=me');

        const {result} = renderHook(() => useCustomSidebarViews('posts'));

        expect(result.current).toEqual([
            {
                key: 'posts?type=draft&author=me',
                name: 'Drafts by me',
                to: 'posts?type=draft&author=me',
                isActive: true,
                color: 'green'
            }
        ]);
    });

    it('does not mark a view active when the URL filters differ', () => {
        setUrl('/posts', '?type=draft');

        const {result} = renderHook(() => useCustomSidebarViews('posts'));

        expect(result.current[0].isActive).toBe(false);
    });

    it('does not mark a view active on a different route', () => {
        setUrl('/pages', '?type=draft&author=me');

        const {result} = renderHook(() => useCustomSidebarViews('posts'));

        expect(result.current[0].isActive).toBe(false);
    });
});
