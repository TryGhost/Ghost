import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {Button} from '../../../../src/components/ui/button';
import {render} from '../../utils/test-utils';

describe('Button Component', () => {
    it('renders correctly with default props', () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole('button', {name: /click me/i});
        
        assert.ok(button, 'Button should be rendered');
        assert.ok(button.className.includes('bg-primary'), 'Should have default variant class');
    });

    it('applies different variants correctly', () => {
        render(<Button variant="destructive">Destructive</Button>);
        const button = screen.getByRole('button', {name: /destructive/i});
        
        assert.ok(button.className.includes('bg-destructive'), 'Should have destructive variant class');
    });

    it('applies different sizes correctly', () => {
        render(<Button size="sm">Small</Button>);
        const button = screen.getByRole('button', {name: /small/i});
        
        assert.ok(button.className.includes('h-7'), 'Should have small size class');
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        
        const button = screen.getByRole('button', {name: /click me/i});
        fireEvent.click(button);
        
        assert.equal(handleClick.mock.calls.length, 1, 'Click handler should be called once');
    });

    it('renders disabled state correctly', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole('button', {name: /disabled/i});
        
        assert.ok(button.hasAttribute('disabled'), 'Button should be disabled');
        assert.ok(button.className.includes('disabled:opacity-50'), 'Should have disabled styling');
    });

    it('renders ChevronDown icon when variant is dropdown', () => {
        render(<Button variant="dropdown">Dropdown</Button>);
        const button = screen.getByRole('button', {name: /dropdown/i});
        
        // Check if SVG is present (ChevronDown icon)
        const svg = button.querySelector('svg');
        assert.ok(svg, 'Dropdown button should contain an SVG icon');
    });

    it('renders as child component when asChild is true', () => {
        render(
            <Button asChild>
                <a href="https://example.com">Link Button</a>
            </Button>
        );
        
        const link = screen.getByRole('link', {name: /link button/i});
        assert.ok(link, 'Should render as an anchor tag');
        assert.equal(link.tagName.toLowerCase(), 'a', 'Should be an A element');
        assert.equal(link.getAttribute('href'), 'https://example.com', 'Should have correct href');
    });
}); 