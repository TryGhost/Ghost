import assert from 'assert/strict';
import { afterEach, beforeAll, describe, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from '../../../../src/components/ui/sidebar';
import { render } from '../../utils/test-utils';

function renderSidebar(
  providerProps: React.ComponentProps<typeof SidebarProvider> = {},
  sidebarProps: React.ComponentProps<typeof Sidebar> = {},
) {
  return render(
    <SidebarProvider {...providerProps}>
      <Sidebar {...sidebarProps}>
        <SidebarContent>
          <a href="#library">Library</a>
        </SidebarContent>
      </Sidebar>
      <SidebarTrigger data-testid="sidebar-trigger" />
    </SidebarProvider>,
  );
}

describe('Sidebar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
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
        dispatchEvent: () => false,
      }),
    });
  });

  it('SidebarTrigger toggles aria-expanded with the sidebar state', () => {
    renderSidebar({ defaultOpen: true });

    const trigger = screen.getByTestId('sidebar-trigger');
    assert.equal(
      trigger.getAttribute('aria-expanded'),
      'true',
      'trigger should be expanded initially',
    );

    fireEvent.click(trigger);
    assert.equal(
      trigger.getAttribute('aria-expanded'),
      'false',
      'trigger should collapse on click',
    );

    fireEvent.click(trigger);
    assert.equal(
      trigger.getAttribute('aria-expanded'),
      'true',
      'trigger should expand again on click',
    );
  });

  it('SidebarTrigger reflects a controlled collapsed state', () => {
    renderSidebar({ open: false });

    const trigger = screen.getByTestId('sidebar-trigger');
    assert.equal(
      trigger.getAttribute('aria-expanded'),
      'false',
      'trigger should reflect the controlled state',
    );
  });

  it('SidebarTrigger aria-controls references the sidebar element', () => {
    renderSidebar();

    const trigger = screen.getByTestId('sidebar-trigger');
    const sidebar = screen.getByRole('navigation');

    assert.ok(sidebar.id, 'sidebar should have an id');
    assert.equal(
      trigger.getAttribute('aria-controls'),
      sidebar.id,
      'aria-controls should match the sidebar id',
    );
  });

  it('keeps cookie persistence enabled by default', () => {
    const setCookie = vi.spyOn(document, 'cookie', 'set');
    renderSidebar();

    fireEvent.click(screen.getByTestId('sidebar-trigger'));

    assert.equal(setCookie.mock.calls[0][0], 'sidebar:state=false; path=/; max-age=604800');
  });

  it('lets a controlled consumer own persistence without suppressing its callback', () => {
    const setCookie = vi.spyOn(document, 'cookie', 'set');
    const onOpenChange = vi.fn();
    renderSidebar({ open: true, onOpenChange, persistState: false });

    fireEvent.click(screen.getByTestId('sidebar-trigger'));

    assert.deepEqual(onOpenChange.mock.calls, [[false]]);
    assert.equal(setCookie.mock.calls.length, 0);
    assert.equal(screen.getByTestId('sidebar-trigger').getAttribute('aria-expanded'), 'true');
  });

  it('keeps the built-in keyboard shortcut enabled by default', () => {
    renderSidebar();
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true });
    fireEvent(window, event);

    assert.equal(event.defaultPrevented, true);
    assert.equal(screen.getByTestId('sidebar-trigger').getAttribute('aria-expanded'), 'false');
  });

  it('does not intercept keyboard events when its shortcut is disabled', () => {
    renderSidebar({ keyboardShortcut: false });
    const event = new KeyboardEvent('keydown', { key: 'b', metaKey: true, cancelable: true });
    fireEvent(window, event);

    assert.equal(event.defaultPrevented, false);
    assert.equal(screen.getByTestId('sidebar-trigger').getAttribute('aria-expanded'), 'true');
    fireEvent.click(screen.getByTestId('sidebar-trigger'));
    assert.equal(screen.getByTestId('sidebar-trigger').getAttribute('aria-expanded'), 'false');
  });

  it('removes an existing keyboard listener when the consumer opts out', () => {
    const renderProvider = (keyboardShortcut: boolean) => (
      <SidebarProvider keyboardShortcut={keyboardShortcut}>
        <SidebarTrigger />
      </SidebarProvider>
    );
    const { rerender } = render(renderProvider(true));
    rerender(renderProvider(false));
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true });
    fireEvent(window, event);

    assert.equal(event.defaultPrevented, false);
    assert.equal(screen.getByRole('button').getAttribute('aria-expanded'), 'true');
  });

  it('reserves desktop layout space by default, including the collapsed-state hook', () => {
    const { container } = renderSidebar();
    assert.ok(container.querySelector('[data-sidebar="gap"]'));
    assert.equal(screen.getByRole('navigation').dataset.layout, 'reserved');
    fireEvent.click(screen.getByTestId('sidebar-trigger'));
    assert.equal(screen.getByRole('navigation').dataset.collapsible, 'offcanvas');
  });

  it('never renders a space-reserving gap for an overlay and makes a closed offcanvas panel inert', () => {
    const { container } = renderSidebar({ defaultOpen: false }, { layout: 'overlay' });
    const panel = container.querySelector('[data-sidebar="panel"]');
    assert.ok(panel);
    assert.equal(container.querySelector('[data-sidebar="gap"]'), null);
    assert.equal(panel.hasAttribute('inert'), true);
    assert.equal(screen.queryByRole('link', { name: 'Library' }), null);

    const trigger = screen.getByTestId('sidebar-trigger');
    trigger.focus();
    fireEvent.click(trigger);

    assert.equal(panel.hasAttribute('inert'), false);
    assert.ok(screen.getByRole('link', { name: 'Library' }));
    assert.equal(document.activeElement, trigger, 'opening a nonmodal panel must not steal focus');
    assert.equal(container.querySelector('[data-sidebar="gap"]'), null);
  });

  it('keeps a collapsed icon overlay interactive', () => {
    const { container } = renderSidebar(
      { defaultOpen: false },
      { layout: 'overlay', collapsible: 'icon' },
    );
    assert.equal(container.querySelector('[data-sidebar="panel"]')?.hasAttribute('inert'), false);
    assert.ok(screen.getByRole('link', { name: 'Library' }));
  });

  it('leaves noncollapsible navigation in normal document flow', () => {
    const { container } = renderSidebar(
      { defaultOpen: false },
      { layout: 'overlay', collapsible: 'none' },
    );
    assert.equal(container.querySelector('[data-sidebar="panel"]'), null);
    assert.equal(screen.getByRole('navigation').hasAttribute('inert'), false);
    assert.ok(screen.getByRole('link', { name: 'Library' }));
  });

  it('retains the mobile Sheet instead of the desktop overlay layout', () => {
    vi.stubGlobal('innerWidth', 800);
    const { container } = renderSidebar({}, { layout: 'overlay' });
    assert.equal(screen.queryByRole('navigation'), null);
    assert.equal(screen.getByTestId('sidebar-trigger').getAttribute('aria-expanded'), 'false');

    fireEvent.click(screen.getByTestId('sidebar-trigger'));

    assert.equal(screen.getByRole('navigation').getAttribute('data-mobile'), 'true');
    assert.equal(container.querySelector('[data-sidebar="panel"]'), null);
    assert.equal(container.querySelector('[data-sidebar="gap"]'), null);
  });
});
