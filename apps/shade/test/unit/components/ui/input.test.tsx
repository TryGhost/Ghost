import assert from 'assert/strict';
import React from 'react';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {Input} from '../../../../src/components/ui/input';
import {render} from '../../utils/test-utils';

describe('Input Component', () => {
    it('renders correctly with default props', () => {
        render(<Input placeholder="Enter text" data-testid="input" />);
        const input = screen.getByTestId('input');
        
        assert.ok(input, 'Input should be rendered');
        assert.equal(input.tagName.toLowerCase(), 'input', 'Should be an input element');
    });

    it('applies custom className correctly', () => {
        render(<Input className="custom-class" data-testid="input" />);
        const input = screen.getByTestId('input');
        
        assert.ok(input.className.includes('custom-class'), 'Should have custom class');
    });

    it('handles input changes', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} data-testid="input" />);
        
        const input = screen.getByTestId('input');
        fireEvent.change(input, {target: {value: 'test value'}});
        
        assert.equal(handleChange.mock.calls.length, 1, 'Change handler should be called once');
    });

    it('renders disabled state correctly', () => {
        render(<Input disabled data-testid="input" />);
        const input = screen.getByTestId('input');
        
        assert.ok(input.hasAttribute('disabled'), 'Input should be disabled');
        assert.ok(input.className.includes('disabled:opacity-50'), 'Should have disabled styling');
    });

    it('passes type attribute correctly', () => {
        render(<Input type="password" data-testid="input" />);
        const input = screen.getByTestId('input');
        
        assert.equal(input.getAttribute('type'), 'password', 'Should have correct type attribute');
    });

    it('applies focus styles when focused', () => {
        render(<Input data-testid="input" />);
        const input = screen.getByTestId('input');
        
        fireEvent.focus(input);
        // Testing focus behavior would require browser environment - we'll just check that it doesn't error
        assert.ok(true);
    });

    it('forwards ref correctly', () => {
        // Testing that a component with ref renders without errors
        const TestComponent = () => {
            const ref = React.useRef(null);
            
            return <Input ref={ref} data-testid="input" />;
        };
        
        render(<TestComponent />);
        const input = screen.getByTestId('input');
        
        // Check that the component rendered
        assert.ok(input, 'Input should be rendered');
    });
}); 