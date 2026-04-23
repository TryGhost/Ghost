// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import NavContent from './nav-content';

const {
    mockCanManageMembers,
    mockCanManageTags,
    mockUseCurrentUser,
    mockUseCustomSidebarViews,
    mockUseEmberRouting,
    mockUseFeatureFlag,
    mockUseIsActiveLink,
    mockUseMemberCount,
    mockUseMemberSidebarViews,
    mockUseNavigationExpanded
} = vi.hoisted(() => ({
    mockCanManageMembers: vi.fn(),
    mockCanManageTags: vi.fn(),
    mockUseCurrentUser: vi.fn(),
    mockUseCustomSidebarViews: vi.fn(),
    mockUseEmberRouting: vi.fn(),
    mockUseFeatureFlag: vi.fn(),
    mockUseIsActiveLink: vi.fn(),
    mockUseMemberCount: vi.fn(),
    mockUseMemberSidebarViews: vi.fn(),
    mockUseNavigationExpanded: vi.fn()
}));

vi.mock('@tryghost/shade/components', () => ({
    SidebarGroup: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    SidebarGroupContent: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    SidebarMenu: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    SidebarMenuBadge: ({children}: {children: React.ReactNode}) => <span>{children}</span>
}));

vi.mock('@tryghost/shade/utils', () => ({
    formatNumber: (value: number) => String(value),
    LucideIcon: {
        File: () => null,
        MessagesSquare: () => null,
        PenLine: () => null,
        Plus: () => null,
        Tag: () => null,
        Users: () => null,
        Zap: () => null
    }
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mockUseCurrentUser
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    canManageMembers: mockCanManageMembers,
    canManageTags: mockCanManageTags
}));

vi.mock('./hooks/use-member-count', () => ({
    useMemberCount: mockUseMemberCount
}));

vi.mock('./hooks/use-navigation-preferences', () => ({
    useNavigationExpanded: mockUseNavigationExpanded
}));

vi.mock('./nav-custom-views', () => ({
    NavCustomViews: () => null
}));

vi.mock('./nav-member-views', () => ({
    NavMemberViews: () => null
}));

vi.mock('./member-sidebar-views', () => ({
    useMemberSidebarViews: mockUseMemberSidebarViews
}));

vi.mock('./use-custom-sidebar-views', () => ({
    useCustomSidebarViews: mockUseCustomSidebarViews
}));

vi.mock('./use-is-active-link', () => ({
    useIsActiveLink: mockUseIsActiveLink
}));

vi.mock('@/ember-bridge', () => ({
    useEmberRouting: mockUseEmberRouting
}));

vi.mock('@/hooks/use-feature-flag', () => ({
    useFeatureFlag: mockUseFeatureFlag
}));

vi.mock('./nav-menu-item', () => {
    const NavMenuItem = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;

    NavMenuItem.Link = ({children}: {children?: React.ReactNode}) => <a>{children}</a>;
    NavMenuItem.Label = ({children}: {children?: React.ReactNode}) => <span>{children}</span>;
    NavMenuItem.Collapsible = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;
    NavMenuItem.CollapsibleItem = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;
    NavMenuItem.CollapsibleMenu = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;

    return {NavMenuItem};
});

describe('NavContent', () => {
    beforeEach(() => {
        mockCanManageMembers.mockReturnValue(true);
        mockCanManageTags.mockReturnValue(false);
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                roles: [{name: 'Administrator'}]
            }
        });
        mockUseCustomSidebarViews.mockReturnValue([]);
        mockUseEmberRouting.mockReturnValue({
            getRouteUrl: (route: string) => route,
            isRouteActive: () => false
        });
        mockUseFeatureFlag.mockReturnValue(false);
        mockUseIsActiveLink.mockReturnValue(false);
        mockUseMemberCount.mockReturnValue(null);
        mockUseMemberSidebarViews.mockReturnValue([]);
        mockUseNavigationExpanded.mockReturnValue([false, vi.fn()]);
    });

    it('does not show the automations sidebar item when the automations labs flag is disabled', () => {
        render(<NavContent />);

        expect(screen.queryByText('Automations')).not.toBeInTheDocument();
    });

    it('shows the automations sidebar item when the automations labs flag is enabled', () => {
        mockUseFeatureFlag.mockImplementation((flag: string) => flag === 'automations');

        render(<NavContent />);

        expect(screen.getByText('Automations')).toBeInTheDocument();
    });
});
