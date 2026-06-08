// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {type SharedView} from './shared-views';
import {useCustomSidebarViews} from './use-custom-sidebar-views';

interface EmberRoutingMock {
    getRouteUrl: (route: 'posts' | 'pages', filter: Record<string, string | null>) => string;
    isRouteActive: (route: 'posts' | 'pages', filter: Record<string, string | null>) => boolean;
}

const {mockUseSharedViews, mockUseEmberRouting} = vi.hoisted(() => ({
    mockUseSharedViews: vi.fn<(route?: string) => SharedView[]>(),
    mockUseEmberRouting: vi.fn<() => EmberRoutingMock>()
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

describe('useCustomSidebarViews', () => {
    it('maps shared views to sidebar views using Ember routing', () => {
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
            isRouteActive: vi.fn(() => true)
        });

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
});
