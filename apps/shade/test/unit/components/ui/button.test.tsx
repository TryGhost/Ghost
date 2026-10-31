import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Button } from '../../../../src/components/ui/button';
import { render } from '../../utils/test-utils';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    expect(button, 'Button should be rendered').toBeTruthy();
    expect(button.className, 'Should have default variant class').toContain('bg-primary');
  });

  it('applies different variants correctly', () => {
    render(<Button variant="destructive">Destructive</Button>);
    const button = screen.getByRole('button', { name: /destructive/i });

    expect(button.className, 'Should have destructive variant class').toContain('bg-destructive');
  });

  it('applies different sizes correctly', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: /small/i });

    expect(button.className, 'Should have small size class').toContain('h-7');
    expect(button.className, 'Should override the base control typography').toContain('text-sm!');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick.mock.calls.length, 'Click handler should be called once').toBe(1);
  });

  it('renders disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });

    expect(button.hasAttribute('disabled'), 'Button should be disabled').toBeTruthy();
    expect(button.className, 'Disabled primary stays opaque').toContain('disabled:opacity-100');
  });

  it('renders ChevronDown icon when variant is dropdown', () => {
    render(<Button variant="dropdown">Dropdown</Button>);
    const button = screen.getByRole('button', { name: /dropdown/i });

    // Check if SVG is present (ChevronDown icon)
    const svg = button.querySelector('svg');
    expect(svg, 'Dropdown button should contain an SVG icon').toBeTruthy();
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: /link button/i });
    expect(link, 'Should render as an anchor tag').toBeTruthy();
    expect(link.tagName.toLowerCase(), 'Should be an A element').toBe('a');
    expect(link.getAttribute('href'), 'Should have correct href').toBe('https://example.com');
  });
});
