import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Banner } from '../../../../src/components/ui/banner';
import { render } from '../../utils/test-utils';

/**
 * TypeScript's discriminated union enforces onDismiss requirement at compile-time
 * when dismissible={true}, so invalid combinations aren't tested here.
 */
describe('Banner Component', () => {
  it('renders children correctly', () => {
    render(<Banner>Test content</Banner>);
    const content = screen.getByText('Test content');

    expect(content, 'Banner should render children').toBeTruthy();
  });

  it('applies default variant and size classes', () => {
    render(<Banner>Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner, 'Banner should be rendered with default role').toBeTruthy();
    expect(banner.className, 'Should have default variant class').toContain('bg-surface-panel');
  });

  it.each([
    { variant: 'info' as const, expectedClass: 'bg-state-info/10' },
    { variant: 'success' as const, expectedClass: 'bg-state-success/10' },
    { variant: 'warning' as const, expectedClass: 'bg-state-warning/10' },
    { variant: 'destructive' as const, expectedClass: 'bg-state-danger/10' },
  ])('applies $variant variant correctly', ({ variant, expectedClass }) => {
    render(<Banner variant={variant}>Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.className, `Should have ${expectedClass} class`).toContain(expectedClass);
  });

  it('gives the destructive variant a 20% danger border', () => {
    render(<Banner variant="destructive">Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.className, 'Should have a 20% border').toContain('border-state-danger/20');
  });

  it('applies gradient variant correctly', () => {
    render(<Banner variant="gradient">Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.className, 'Should have gradient variant class').toContain('bg-surface-elevated');
    expect(banner.className, 'Gradient variant should be clickable').toContain('cursor-pointer');
  });

  it.each([
    { size: 'sm' as const, expectedClass: 'p-2' },
    { size: 'lg' as const, expectedClass: 'p-4' },
  ])('applies $size size correctly', ({ size, expectedClass }) => {
    render(<Banner size={size}>Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.className, `Should have ${expectedClass} class`).toContain(expectedClass);
  });

  it('applies correct role by default', () => {
    render(<Banner>Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.getAttribute('role'), 'Should have status role by default').toBe('status');
    // Note: role="status" has implicit aria-live="polite", no need to set explicitly
  });

  it('applies custom role', () => {
    render(<Banner role="alert">Content</Banner>);
    const banner = screen.getByRole('alert');

    expect(banner.getAttribute('role'), 'Should have alert role').toBe('alert');
    // Note: role="alert" has implicit aria-live="assertive"
  });

  it('allows overriding ARIA attributes via standard props', () => {
    render(
      <Banner aria-label="Test banner" aria-live="assertive" role="region">
        Content
      </Banner>,
    );

    const banner = screen.getByRole('region');
    expect(banner.getAttribute('role'), 'Should have region role').toBe('region');
    expect(banner.getAttribute('aria-live'), 'Should have assertive aria-live').toBe('assertive');
    expect(banner.getAttribute('aria-label'), 'Should have custom aria-label').toBe('Test banner');
  });

  describe('Non-dismissible variant', () => {
    it.each([
      { dismissible: undefined, description: 'not set' },
      { dismissible: false as const, description: 'explicitly false' },
    ])('does not show dismiss button when dismissible is $description', ({ dismissible }) => {
      render(<Banner dismissible={dismissible}>Content</Banner>);
      const dismissButton = screen.queryByLabelText('Dismiss notification');

      expect(dismissButton, 'Dismiss button should not be rendered').toBeNull();
    });
  });

  describe('Dismissible variant', () => {
    it('shows dismiss button when dismissible (requires onDismiss)', () => {
      const onDismiss = vi.fn();
      render(
        <Banner dismissible onDismiss={onDismiss}>
          Content
        </Banner>,
      );
      const dismissButton = screen.getByLabelText('Dismiss notification');

      expect(dismissButton, 'Dismiss button should be rendered').toBeTruthy();
    });

    it('calls onDismiss when close button clicked', () => {
      const onDismiss = vi.fn();
      render(
        <Banner dismissible onDismiss={onDismiss}>
          Content
        </Banner>,
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      expect(onDismiss.mock.calls.length, 'onDismiss should be called once').toBe(1);
    });

    it('maintains stateless behavior - parent manages visibility', () => {
      const onDismiss = vi.fn();
      render(
        <Banner dismissible onDismiss={onDismiss}>
          Content
        </Banner>,
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      // Component is stateless, so it should still be visible after dismiss
      // Parent component is responsible for hiding/removing it
      const content = screen.getByText('Content');
      expect(content, 'Banner should still be rendered (parent manages visibility)').toBeTruthy();
      expect(onDismiss.mock.calls.length, 'onDismiss should be called once').toBe(1);
    });

    it('prevents propagation on dismiss click', () => {
      const parentClick = vi.fn();
      const onDismiss = vi.fn();
      render(
        <div onClick={parentClick}>
          <Banner dismissible onDismiss={onDismiss}>
            Content
          </Banner>
        </div>,
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      expect(parentClick.mock.calls.length, 'Parent click handler should not be called').toBe(0);
    });
  });

  it('allows parent click handler when clicking banner content', () => {
    const bannerClick = vi.fn();
    render(<Banner onClick={bannerClick}>Content</Banner>);

    const banner = screen.getByRole('status');
    fireEvent.click(banner);

    expect(bannerClick.mock.calls.length, 'Banner click handler should be called').toBe(1);
  });

  it('applies custom className', () => {
    render(<Banner className="custom-class">Content</Banner>);
    const banner = screen.getByRole('status');

    expect(banner.className, 'Should apply custom className').toContain('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Banner ref={ref}>Content</Banner>);

    expect(ref.current, 'Ref should be forwarded').toBeTruthy();
  });

  it('renders with region role when specified', () => {
    render(
      <Banner aria-label="Important region" role="region">
        Content
      </Banner>,
    );
    const banner = screen.getByRole('region');

    expect(banner, 'Banner should render with region role').toBeTruthy();
    expect(banner.getAttribute('aria-label'), 'Should have aria-label for region').toBe(
      'Important region',
    );
  });

  it('supports all HTML div attributes', () => {
    render(
      <Banner data-testid="test-banner" id="banner-id" style={{ marginTop: '10px' }}>
        Content
      </Banner>,
    );

    const banner = screen.getByRole('status');
    expect(banner.getAttribute('data-testid'), 'Should support data attributes').toBe(
      'test-banner',
    );
    expect(banner.getAttribute('id'), 'Should support id attribute').toBe('banner-id');
    expect(banner.style.marginTop, 'Should support style attribute').toBeTruthy();
  });
});
