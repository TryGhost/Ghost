// @vitest-environment jsdom

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {HideableSidebarItem, SidebarCustomizationProvider} from './sidebar-customization';
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
            <HideableSidebarItem id="posts" label="Posts">
                <span>Posts nav item</span>
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
        expect(screen.getByRole('menuitemcheckbox', {name: 'Posts'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitemcheckbox', {name: 'Help'})).not.toBeInTheDocument();
    });

    it('hides registered sidebar items but keeps them customizable', async () => {
        mockUseNavigationItemVisibility.mockImplementation(itemId => itemId !== 'posts');

        renderSidebar();

        expect(screen.queryByText('Posts nav item')).not.toBeInTheDocument();

        fireEvent.contextMenu(screen.getByTestId('sidebar'));

        const menuItem = await screen.findByRole('menuitemcheckbox', {name: 'Posts'});
        expect(menuItem).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(menuItem);

        expect(toggleVisibility).toHaveBeenCalledWith('posts', true);
        expect(screen.getByText('Customize sidebar')).toBeInTheDocument();
    });
});
