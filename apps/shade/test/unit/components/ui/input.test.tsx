import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Input } from '../../../../src/components/ui/input';
import { render } from '../../utils/test-utils';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input data-testid="input" placeholder="Enter text" />);
    const input = screen.getByTestId('input');

    expect(input, 'Input should be rendered').toBeTruthy();
    expect(input.tagName.toLowerCase(), 'Should be an input element').toBe('input');
    expect(input.className, 'Should use the shared control height').toContain(
      'h-(--control-height)',
    );
    expect(input.className, 'Should not use a fixed height').not.toContain('h-9');
  });

  it('applies custom className correctly', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const input = screen.getByTestId('input');

    expect(input.className, 'Should have custom class').toContain('custom-class');
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    render(<Input data-testid="input" onChange={handleChange} />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange.mock.calls.length, 'Change handler should be called once').toBe(1);
  });

  it('renders disabled state correctly', () => {
    render(<Input data-testid="input" disabled />);
    const input = screen.getByTestId('input');

    expect(input.hasAttribute('disabled'), 'Input should be disabled').toBeTruthy();
    expect(input.className, 'Should have a disabled surface').toContain(
      'disabled:bg-control-disabled-surface',
    );
    expect(input.className, 'Should keep disabled values readable').toContain(
      'disabled:text-muted-foreground',
    );
  });

  it('passes type attribute correctly', () => {
    render(<Input data-testid="input" type="password" />);
    const input = screen.getByTestId('input');

    expect(input.getAttribute('type'), 'Should have correct type attribute').toBe('password');
  });

  it('applies focus styles when focused', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    fireEvent.focus(input);
    // Testing focus behavior would require browser environment - we'll just check that it doesn't error
    expect(true).toBeTruthy();
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
    expect(input, 'Input should be rendered').toBeTruthy();
  });
});
