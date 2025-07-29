import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {Badge} from '../../../../src/components/ui/badge';
import {render} from '../../utils/test-utils';

describe('Badge Component', () => {
    it('renders correctly with default props', () => {
        render(<Badge>Default Badge</Badge>);
        const badge = screen.getByText('Default Badge');
        
        assert.ok(badge, 'Badge should be rendered');
        assert.ok(badge.className.includes('bg-primary'), 'Should have default variant class');
    });

    it('applies different variants correctly', () => {
        render(<Badge variant="secondary">Secondary Badge</Badge>);
        const badge = screen.getByText('Secondary Badge');
        
        assert.ok(badge.className.includes('bg-secondary'), 'Should have secondary variant class');
    });

    it('applies destructive variant correctly', () => {
        render(<Badge variant="destructive">Destructive Badge</Badge>);
        const badge = screen.getByText('Destructive Badge');
        
        assert.ok(badge.className.includes('bg-destructive'), 'Should have destructive variant class');
    });

    it('applies success variant correctly', () => {
        render(<Badge variant="success">Success Badge</Badge>);
        const badge = screen.getByText('Success Badge');
        
        assert.ok(badge.className.includes('bg-green'), 'Should have success variant class');
    });

    it('applies outline variant correctly', () => {
        render(<Badge variant="outline">Outline Badge</Badge>);
        const badge = screen.getByText('Outline Badge');
        
        assert.ok(badge.className.includes('text-foreground'), 'Should have outline variant class');
    });

    it('applies custom className correctly', () => {
        render(<Badge className="custom-class">Custom Badge</Badge>);
        const badge = screen.getByText('Custom Badge');
        
        assert.ok(badge.className.includes('custom-class'), 'Should have custom class');
    });

    it('passes additional props to the div element', () => {
        render(<Badge data-testid="badge-test">Test Badge</Badge>);
        const badge = screen.getByTestId('badge-test');
        
        assert.equal(badge.textContent, 'Test Badge', 'Should render the text content');
    });
}); 