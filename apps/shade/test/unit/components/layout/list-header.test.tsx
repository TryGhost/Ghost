import assert from 'assert/strict';
import {beforeEach, describe, it} from 'vitest';
import {screen, within} from '@testing-library/react';
import {DropdownMenuItem} from '../../../../src/components/ui/dropdown-menu';
import {ListHeader} from '../../../../src/components/layout/list-header';
import {render} from '../../utils/test-utils';

const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
        writable: true
    });
    window.dispatchEvent(new Event('resize'));
};

describe('ListHeader ActionGroup', () => {
    beforeEach(() => {
        setViewportWidth(1024);
    });

    it('renders all actions directly when no mobile menu is provided', () => {
        render(
            <ListHeader.ActionGroup>
                <button>Search</button>
                <button>Filter</button>
            </ListHeader.ActionGroup>
        );

        const actionGroup = document.querySelector('[data-list-header="list-header-action-group"]');
        assert.ok(screen.getByRole('button', {name: 'Search'}));
        assert.ok(screen.getByRole('button', {name: 'Filter'}));
        assert.ok(actionGroup?.className.includes('justify-end'), 'Action group should be right-aligned');
        assert.equal(document.querySelector('[data-list-header="list-header-action-group-desktop"]'), null);
        assert.equal(document.querySelector('[data-list-header="list-header-action-group-mobile"]'), null);
    });

    it('renders only the mobile menu trigger in mobile row when no primary action is provided', () => {
        render(
            <ListHeader.ActionGroup mobileMenuBreakpoint={1200}>
                <button>Search</button>
                <button>Filter</button>
                <ListHeader.ActionGroup.MobileMenu>
                    <ListHeader.ActionGroup.MobileMenuTrigger>
                        <button aria-label="Open menu">Menu</button>
                    </ListHeader.ActionGroup.MobileMenuTrigger>
                    <ListHeader.ActionGroup.MobileMenuContent>
                        <DropdownMenuItem>Filter</DropdownMenuItem>
                    </ListHeader.ActionGroup.MobileMenuContent>
                </ListHeader.ActionGroup.MobileMenu>
            </ListHeader.ActionGroup>
        );

        const desktop = document.querySelector('[data-list-header="list-header-action-group-desktop"]');
        const mobile = document.querySelector('[data-list-header="list-header-action-group-mobile"]');

        assert.equal(desktop, null, 'Desktop row should be hidden when collapsed');
        assert.ok(mobile, 'Mobile row should be rendered');
        assert.ok((mobile as HTMLElement).className.includes('ml-auto'), 'Mobile row should stay right-aligned');
        assert.ok(within(mobile as HTMLElement).getByRole('button', {name: 'Open menu'}));
        assert.equal(within(mobile as HTMLElement).queryByRole('button', {name: 'Search'}), null);
        assert.equal(within(mobile as HTMLElement).queryByRole('button', {name: 'Filter'}), null);
        assert.equal(document.querySelector('[data-list-header="list-header-action-group-mobile-primary"]'), null);
    });

    it('renders both primary action and mobile menu trigger in mobile row when primary action is provided', () => {
        render(
            <ListHeader.ActionGroup mobileMenuBreakpoint={1200}>
                <button>Search</button>
                <button>Filter</button>
                <ListHeader.ActionGroup.Primary>
                    <button>Add member</button>
                </ListHeader.ActionGroup.Primary>
                <ListHeader.ActionGroup.MobileMenu>
                    <ListHeader.ActionGroup.MobileMenuTrigger>
                        <button aria-label="Open menu">Menu</button>
                    </ListHeader.ActionGroup.MobileMenuTrigger>
                    <ListHeader.ActionGroup.MobileMenuContent>
                        <DropdownMenuItem>Filter</DropdownMenuItem>
                    </ListHeader.ActionGroup.MobileMenuContent>
                </ListHeader.ActionGroup.MobileMenu>
            </ListHeader.ActionGroup>
        );

        const desktop = document.querySelector('[data-list-header="list-header-action-group-desktop"]');
        const mobile = document.querySelector('[data-list-header="list-header-action-group-mobile"]');
        const mobilePrimary = document.querySelector('[data-list-header="list-header-action-group-mobile-primary"]');

        assert.equal(desktop, null, 'Desktop row should be hidden when collapsed');
        assert.ok(mobile, 'Mobile row should be rendered');
        assert.ok(mobilePrimary, 'Mobile primary wrapper should be rendered');
        assert.ok(within(mobile as HTMLElement).getByRole('button', {name: 'Add member'}));
        assert.ok(within(mobile as HTMLElement).getByRole('button', {name: 'Open menu'}));
        const mobileButtons = within(mobile as HTMLElement).getAllByRole('button');
        assert.equal(mobileButtons[0].getAttribute('aria-label'), 'Open menu', 'Mobile menu should render on the left');
        assert.equal(mobileButtons[1].textContent, 'Add member', 'Primary action should render on the right');
        assert.equal(within(mobile as HTMLElement).queryByRole('button', {name: 'Search'}), null);
        assert.equal(within(mobile as HTMLElement).queryByRole('button', {name: 'Filter'}), null);
    });

    it('shows full desktop actions when viewport is above the provided mobile breakpoint', () => {
        render(
            <ListHeader.ActionGroup mobileMenuBreakpoint={900}>
                <button>Search</button>
                <button>Filter</button>
                <ListHeader.ActionGroup.Primary>
                    <button>Add member</button>
                </ListHeader.ActionGroup.Primary>
                <ListHeader.ActionGroup.MobileMenu>
                    <ListHeader.ActionGroup.MobileMenuTrigger>
                        <button aria-label="Open menu">Menu</button>
                    </ListHeader.ActionGroup.MobileMenuTrigger>
                    <ListHeader.ActionGroup.MobileMenuContent>
                        <DropdownMenuItem>Filter</DropdownMenuItem>
                    </ListHeader.ActionGroup.MobileMenuContent>
                </ListHeader.ActionGroup.MobileMenu>
            </ListHeader.ActionGroup>
        );

        const desktop = document.querySelector('[data-list-header="list-header-action-group-desktop"]');
        const mobile = document.querySelector('[data-list-header="list-header-action-group-mobile"]');

        assert.ok(desktop, 'Desktop row should render above the configured breakpoint');
        assert.equal(mobile, null, 'Mobile row should not render above the configured breakpoint');
        assert.ok(within(desktop as HTMLElement).getByRole('button', {name: 'Search'}));
        assert.ok(within(desktop as HTMLElement).getByRole('button', {name: 'Filter'}));
        assert.ok(within(desktop as HTMLElement).getByRole('button', {name: 'Add member'}));
    });
});
