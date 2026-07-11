import assert from 'assert/strict';
import {beforeAll, describe, it} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {
    Sidebar,
    SidebarContent,
    SidebarProvider,
    SidebarTrigger
} from '../../../../src/components/ui/sidebar';
import {render} from '../../utils/test-utils';

function renderSidebar(providerProps: React.ComponentProps<typeof SidebarProvider> = {}) {
    return render(
        <SidebarProvider {...providerProps}>
            <Sidebar>
                <SidebarContent />
            </Sidebar>
            <SidebarTrigger data-testid="sidebar-trigger" />
        </SidebarProvider>
    );
}

describe('Sidebar', () => {
    beforeAll(() => {
        // jsdom does not implement matchMedia, which useIsMobile relies on
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: (query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                addListener: () => {},
                removeListener: () => {},
                dispatchEvent: () => false
            })
        });
    });

    it('SidebarTrigger toggles aria-expanded with the sidebar state', () => {
        renderSidebar({defaultOpen: true});

        const trigger = screen.getByTestId('sidebar-trigger');
        assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'trigger should be expanded initially');

        fireEvent.click(trigger);
        assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'trigger should collapse on click');

        fireEvent.click(trigger);
        assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'trigger should expand again on click');
    });

    it('SidebarTrigger reflects a controlled collapsed state', () => {
        renderSidebar({open: false});

        const trigger = screen.getByTestId('sidebar-trigger');
        assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'trigger should reflect the controlled state');
    });

    it('SidebarTrigger aria-controls references the sidebar element', () => {
        renderSidebar();

        const trigger = screen.getByTestId('sidebar-trigger');
        const sidebar = screen.getByRole('navigation');

        assert.ok(sidebar.id, 'sidebar should have an id');
        assert.equal(trigger.getAttribute('aria-controls'), sidebar.id, 'aria-controls should match the sidebar id');
    });
});
