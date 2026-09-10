import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '../../utils/test-utils';
import ShadeProvider from '../../../../src/providers/shade-provider';
import { PageHeader } from '../../../../src/components/patterns/page-header';
import { DropdownMenuItem } from '../../../../src/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';
import { Button } from '../../../../src/components/ui/button';

function Header({ mobile = false }: { mobile?: boolean }) {
  return (
    <PageHeader.ActionGroup mobileMenuBreakpoint={mobile ? 10000 : 1}>
      <PageHeader.Action label="Filter">
        <svg />
        Filter
      </PageHeader.Action>
      <PageHeader.Action label="Search" iconOnly>
        <svg />
      </PageHeader.Action>
      <PageHeader.ActionGroup.MobileMenu>
        <PageHeader.ActionGroup.MobileMenuTrigger>
          <PageHeader.Action label="More actions" iconOnly>
            <svg />
          </PageHeader.Action>
        </PageHeader.ActionGroup.MobileMenuTrigger>
        <PageHeader.ActionGroup.MobileMenuContent>
          <DropdownMenuItem>Filter</DropdownMenuItem>
        </PageHeader.ActionGroup.MobileMenuContent>
      </PageHeader.ActionGroup.MobileMenu>
      <PageHeader.ActionGroup.Primary>
        <PageHeader.Action fallbackVariant="default" label="New member">
          <svg />
          New member
        </PageHeader.Action>
      </PageHeader.ActionGroup.Primary>
    </PageHeader.ActionGroup>
  );
}

describe('PageHeader action contract', () => {
  it('inherits current controls and primary semantics without styling props', () => {
    render(
      <ShadeProvider darkMode={false}>
        <Header />
      </ShadeProvider>,
    );
    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Filter', 'Search', 'New member']);
    const primary = screen.getByRole('button', { name: 'New member' });
    expect(primary.className).toContain('bg-primary');
    expect(primary.className).toContain('rounded-full');
    fireEvent.focus(primary);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('tooltip').textContent).toContain('Search');
  });

  it.each([true, false])('forwards primary classes with isAdmin7Design=%s', (isAdmin7Design) => {
    render(
      <ShadeProvider darkMode={false} isAdmin7Design={isAdmin7Design}>
        <PageHeader.ActionGroup>
          <PageHeader.ActionGroup.Primary className="custom-primary">
            <PageHeader.Action className="custom-action" label="Save">
              Save
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        </PageHeader.ActionGroup>
      </ShadeProvider>,
    );
    const primary = screen.getByRole('button', { name: 'Save' });
    expect(primary.className).toContain('custom-action');
    expect(primary.closest('.custom-primary')).not.toBeNull();
  });

  it('renders no spacing wrapper when a conditional primary is absent', () => {
    const { container } = render(
      <ShadeProvider darkMode={false}>
        <PageHeader.ActionGroup>
          <PageHeader.Action label="More" iconOnly>
            <svg />
          </PageHeader.Action>
          <PageHeader.ActionGroup.Primary>{false}</PageHeader.ActionGroup.Primary>
        </PageHeader.ActionGroup>
      </ShadeProvider>,
    );
    expect(container.querySelector('[data-page-header=primary]')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps previous controls and focus behavior without adding header tooltips', () => {
    render(
      <ShadeProvider darkMode={false} isAdmin7Design={false}>
        <Header />
      </ShadeProvider>,
    );
    const filter = screen.getByRole('button', { name: 'Filter' });
    expect(filter.getAttribute('data-control-shape')).toBe('rounded');
    fireEvent.focus(filter);
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'New member' }).closest('[data-page-header=primary]'),
    ).toBeNull();
  });

  it('keeps the mobile primary beside overflow in the same spacing group', () => {
    render(
      <ShadeProvider darkMode={false}>
        <Header mobile />
      </ShadeProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    const more = screen.getByRole('button', { name: 'More actions' });
    const primary = screen
      .getByRole('button', { name: 'New member' })
      .closest('[data-page-header=primary]');
    expect(primary?.parentElement).toBe(more.parentElement);
    expect(primary?.previousElementSibling).toBe(more);
  });

  it('forwards previous asChild handlers and refs through a tooltip wrapper to a real popover', async () => {
    const ref = React.createRef<HTMLButtonElement>();
    const clicked = vi.fn();
    render(
      <ShadeProvider darkMode={false} isAdmin7Design={false}>
        <PageHeader.Tooltip label="More">
          <Popover>
            <PopoverTrigger asChild>
              <PageHeader.TooltipTrigger asChild>
                <Button ref={ref} onClick={clicked}>
                  More
                </Button>
              </PageHeader.TooltipTrigger>
            </PopoverTrigger>
            <PopoverContent>Actions</PopoverContent>
          </Popover>
        </PageHeader.Tooltip>
      </ShadeProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    expect(ref.current).toBe(trigger);
    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(clicked).toHaveBeenCalledOnce();
    expect(screen.getByText('Actions')).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
