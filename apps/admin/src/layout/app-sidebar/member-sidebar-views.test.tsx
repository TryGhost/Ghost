// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {type SharedView} from './shared-views';
import {useMemberSidebarViews} from './member-sidebar-views';

const {mockUseLocation, mockUseSharedViews} = vi.hoisted(() => ({
    mockUseLocation: vi.fn(),
    mockUseSharedViews: vi.fn<(route?: string) => SharedView[]>()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useLocation: mockUseLocation
}));

vi.mock('./shared-views', () => ({
    useSharedViews: mockUseSharedViews
}));

describe('useMemberSidebarViews', () => {
    it('builds saved member view URLs on the members route', () => {
        mockUseLocation.mockReturnValue({
            pathname: '/members',
            search: '?filter=status%3Afree'
        });
        mockUseSharedViews.mockReturnValue([
            {
                name: 'Free members',
                route: 'members',
                filter: {filter: 'status:free'}
            }
        ]);

        const {result} = renderHook(() => useMemberSidebarViews());

        expect(result.current).toEqual([
            {
                key: 'Free members:status:free',
                name: 'Free members',
                to: 'members?filter=status%3Afree',
                isActive: true
            }
        ]);
    });

    it('does not mark saved member views active off the base members route', () => {
        mockUseLocation.mockReturnValue({
            pathname: '/members/import',
            search: '?filter=status%3Afree'
        });
        mockUseSharedViews.mockReturnValue([
            {
                name: 'Free members',
                route: 'members',
                filter: {filter: 'status:free'}
            }
        ]);

        const {result} = renderHook(() => useMemberSidebarViews());

        expect(result.current[0]).toMatchObject({
            to: 'members?filter=status%3Afree',
            isActive: false
        });
    });
});
