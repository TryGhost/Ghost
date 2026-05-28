// @vitest-environment jsdom

import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {HideableSidebarItem, SidebarCustomizationProvider} from './sidebar-customization';
import {NavMenuItem} from './nav-menu-item';
import {useSidebarCustomizationContext} from './sidebar-customization-context';

const {mockUseNavigationItemVisibility, mockUseToggleNavigationItemVisibility} = vi.hoisted(() => ({
    mockUseNavigationItemVisibility: vi.fn<(itemId: string) => boolean>(),
    mockUseToggleNavigationItemVisibility: vi.fn<() => (itemId: string, visible: boolean) => Promise<void>>()
}));

vi.mock('./hooks/use-navigation-preferences', () => ({
    useNavigationItemVisibility: mockUseNavigationItemVisibility,
    useToggleNavigationItemVisibility: mockUseToggleNavigationItemVisibility
}));

function TestSidebar() {
    const {openContextMenu} = useSidebarCustomizationContext();

    return (
        <div data-testid="sidebar" onContextMenu={openContextMenu}>
            <span>Posts nav item</span>
            <HideableSidebarItem id="pages" label="Pages">
                <span>Pages nav item</span>
            </HideableSidebarItem>
            <span>Help</span>
        </div>
    );
}

function renderSidebar() {
    return render(
        <SidebarCustomizationProvider>
            <TestSidebar />
        </SidebarCustomizationProvider>
    );
}

function ReorderingSidebar() {
    const [showFirstItem, setShowFirstItem] = React.useState(true);
    const {openContextMenu} = useSidebarCustomizationContext();

    return (
        <div data-testid="sidebar" onContextMenu={openContextMenu}>
            {showFirstItem ? (
                <HideableSidebarItem id="analytics" label="Analytics">
                    <span>Analytics nav item</span>
                </HideableSidebarItem>
            ) : (
                <span>Analytics hidden</span>
            )}
            <HideableSidebarItem id="network" label="Network">
                <span>Network nav item</span>
            </HideableSidebarItem>
            <button type="button" onClick={() => setShowFirstItem(false)}>Hide first item</button>
            <button type="button" onClick={() => setShowFirstItem(true)}>Show first item</button>
        </div>
    );
}

function CollapsibleSidebar() {
    const {openContextMenu} = useSidebarCustomizationContext();

    return (
        <div data-testid="sidebar" onContextMenu={openContextMenu}>
            <HideableSidebarItem id="members" label="Members">
                <NavMenuItem.Collapsible
                    expanded={true}
                    id="members-submenu"
                    onExpandedChange={vi.fn()}
                >
                    <NavMenuItem.CollapsibleItem ariaLabel="Toggle member views">
                        <span>Members nav item</span>
                    </NavMenuItem.CollapsibleItem>
                    <NavMenuItem.CollapsibleMenu>
                        <span>All members</span>
                    </NavMenuItem.CollapsibleMenu>
                </NavMenuItem.Collapsible>
            </HideableSidebarItem>
        </div>
    );
}

describe('SidebarCustomizationProvider', () => {
    const toggleVisibility = vi.fn<(itemId: string, visible: boolean) => Promise<void>>();

    beforeEach(() => {
        vi.clearAllMocks();
        toggleVisibility.mockResolvedValue(undefined);
        mockUseNavigationItemVisibility.mockReturnValue(true);
        mockUseToggleNavigationItemVisibility.mockReturnValue(toggleVisibility);
    });

    it('opens customization items from the sidebar context menu', async () => {
        renderSidebar();

        fireEvent.contextMenu(screen.getByTestId('sidebar'));

        await waitFor(() => {
            expect(screen.getByText('Customize sidebar')).toBeInTheDocument();
        });
        expect(screen.getByRole('menuitemcheckbox', {name: 'Pages'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitemcheckbox', {name: 'Posts'})).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitemcheckbox', {name: 'Help'})).not.toBeInTheDocument();
    });

    it('hides registered sidebar items but keeps them customizable', async () => {
        mockUseNavigationItemVisibility.mockImplementation(itemId => itemId !== 'pages');

        renderSidebar();

        expect(screen.getByText('Posts nav item')).toBeInTheDocument();
        expect(screen.queryByText('Pages nav item')).not.toBeInTheDocument();

        fireEvent.contextMenu(screen.getByTestId('sidebar'));

        const menuItem = await screen.findByRole('menuitemcheckbox', {name: 'Pages'});
        expect(menuItem).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(menuItem);

        expect(toggleVisibility).toHaveBeenCalledWith('pages', true);
        expect(screen.getByText('Customize sidebar')).toBeInTheDocument();
    });

    it('opens an item context menu for hiding a visible sidebar item', async () => {
        renderSidebar();

        fireEvent.contextMenu(screen.getByText('Pages nav item'));

        const menuItem = await screen.findByRole('button', {name: 'Hide from sidebar'});
        expect(screen.queryByText('Customize sidebar')).not.toBeInTheDocument();

        fireEvent.click(menuItem);

        expect(toggleVisibility).toHaveBeenCalledWith('pages', false);
        expect(screen.queryByRole('button', {name: 'Hide from sidebar'})).not.toBeInTheDocument();
    });

    it('opens an item context menu for hiding a collapsible sidebar item', async () => {
        render(
            <SidebarCustomizationProvider>
                <CollapsibleSidebar />
            </SidebarCustomizationProvider>
        );

        fireEvent.contextMenu(screen.getByText('Members nav item'));

        const menuItem = await screen.findByRole('button', {name: 'Hide from sidebar'});
        expect(screen.queryByText('Customize sidebar')).not.toBeInTheDocument();

        fireEvent.click(menuItem);

        expect(toggleVisibility).toHaveBeenCalledWith('members', false);
    });

    it('keeps menu item order stable when an item unregisters and registers again', async () => {
        render(
            <SidebarCustomizationProvider>
                <ReorderingSidebar />
            </SidebarCustomizationProvider>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Hide first item'}));
        fireEvent.click(screen.getByRole('button', {name: 'Show first item'}));
        fireEvent.contextMenu(screen.getByTestId('sidebar'));

        const menuItems = await screen.findAllByRole('menuitemcheckbox');

        expect(menuItems.map(menuItem => menuItem.textContent)).toEqual(['Analytics', 'Network']);
    });
});
