// @vitest-environment jsdom

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {NavMenuItem} from './nav-menu-item';

vi.mock('./use-is-active-link', () => ({
    useIsActiveLink: () => false
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useMatch: () => null
}));

vi.mock('@tryghost/shade', async () => {
    const React = await import('react');

    return {
        SidebarMenuButton: ({children, asChild, ...props}: React.ComponentProps<'button'> & {asChild?: boolean}) => {
            if (asChild && React.isValidElement(children)) {
                return React.cloneElement(children, props);
            }

            return <button {...props}>{children}</button>;
        },
        SidebarMenuItem: ({children, ...props}: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
        Button: ({children, ...props}: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
        LucideIcon: {
            ChevronRight: (props: React.ComponentProps<'svg'>) => <svg {...props} />
        },
        useSidebar: () => ({
            isMobile: false,
            setOpenMobile: vi.fn()
        })
    };
});

describe('NavMenuItem.Collapsible', () => {
    it('wires the toggle button and collapsible menu through shared state', () => {
        const onExpandedChange = vi.fn();

        render(
            <NavMenuItem.Collapsible
                expanded={true}
                id="test-submenu"
                onExpandedChange={onExpandedChange}
            >
                <NavMenuItem.CollapsibleItem ariaLabel="Toggle test section">
                    <span>Section</span>
                </NavMenuItem.CollapsibleItem>
                <NavMenuItem.CollapsibleMenu>
                    <div>Nested item</div>
                </NavMenuItem.CollapsibleMenu>
            </NavMenuItem.Collapsible>
        );

        const toggle = screen.getByRole('button', {name: 'Toggle test section'});
        expect(toggle.getAttribute('aria-controls')).toBe('test-submenu');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Nested item').parentElement?.parentElement?.getAttribute('id')).toBe('test-submenu');

        fireEvent.click(toggle);

        expect(onExpandedChange).toHaveBeenCalledWith(false);
    });

    it('unmounts nested items when collapsed', () => {
        render(
            <NavMenuItem.Collapsible
                expanded={false}
                id="test-submenu"
                onExpandedChange={vi.fn()}
            >
                <NavMenuItem.CollapsibleItem ariaLabel="Toggle test section">
                    <span>Section</span>
                </NavMenuItem.CollapsibleItem>
                <NavMenuItem.CollapsibleMenu>
                    <div>Nested item</div>
                </NavMenuItem.CollapsibleMenu>
            </NavMenuItem.Collapsible>
        );

        expect(screen.queryByText('Nested item')).not.toBeInTheDocument();
    });
});
