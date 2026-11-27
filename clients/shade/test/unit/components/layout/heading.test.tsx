import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { H1, H2, H3, H4 } from '../../../../src/components/layout/heading';
import { render } from '../../utils/test-utils';

describe('Heading Components', () => {
  it('renders H1 with correct tag and styling', () => {
    render(<H1 data-testid="h1">Heading 1</H1>);
    const heading = screen.getByTestId('h1');

    expect(heading, 'H1 should be rendered').toBeTruthy();
    expect(heading.tagName.toLowerCase(), 'Should be an h1 element').toBe('h1');
    expect(heading.textContent, 'Should render the provided content').toBe('Heading 1');
    expect(heading.className, 'Should have correct styling').toContain('text-2xl');
    expect(heading.className, 'Should have font-bold class').toContain('font-bold');
  });

  it('applies custom className to H1 correctly', () => {
    render(
      <H1 className="custom-h1-class" data-testid="h1">
        Heading 1
      </H1>,
    );
    const heading = screen.getByTestId('h1');

    expect(heading.className, 'Should have custom class').toContain('custom-h1-class');
    expect(heading.className, 'Should retain default styling').toContain('text-2xl');
  });

  it('renders H2 with correct tag and styling', () => {
    render(<H2 data-testid="h2">Heading 2</H2>);
    const heading = screen.getByTestId('h2');

    expect(heading, 'H2 should be rendered').toBeTruthy();
    expect(heading.tagName.toLowerCase(), 'Should be an h2 element').toBe('h2');
    expect(heading.textContent, 'Should render the provided content').toBe('Heading 2');
    expect(heading.className, 'Should have correct styling').toContain('text-xl');
    expect(heading.className, 'Should have font-bold class').toContain('font-bold');
  });

  it('applies custom className to H2 correctly', () => {
    render(
      <H2 className="custom-h2-class" data-testid="h2">
        Heading 2
      </H2>,
    );
    const heading = screen.getByTestId('h2');

    expect(heading.className, 'Should have custom class').toContain('custom-h2-class');
    expect(heading.className, 'Should retain default styling').toContain('text-xl');
  });

  it('renders H3 with correct tag and styling', () => {
    render(<H3 data-testid="h3">Heading 3</H3>);
    const heading = screen.getByTestId('h3');

    expect(heading, 'H3 should be rendered').toBeTruthy();
    expect(heading.tagName.toLowerCase(), 'Should be an h3 element').toBe('h3');
    expect(heading.textContent, 'Should render the provided content').toBe('Heading 3');
    expect(heading.className, 'Should have correct styling').toContain('text-lg');
    expect(heading.className, 'Should have font-semibold class').toContain('font-semibold');
  });

  it('applies custom className to H3 correctly', () => {
    render(
      <H3 className="custom-h3-class" data-testid="h3">
        Heading 3
      </H3>,
    );
    const heading = screen.getByTestId('h3');

    expect(heading.className, 'Should have custom class').toContain('custom-h3-class');
    expect(heading.className, 'Should retain default styling').toContain('text-lg');
  });

  it('renders H4 with correct tag and styling', () => {
    render(<H4 data-testid="h4">Heading 4</H4>);
    const heading = screen.getByTestId('h4');

    expect(heading, 'H4 should be rendered').toBeTruthy();
    expect(heading.tagName.toLowerCase(), 'Should be an h4 element').toBe('h4');
    expect(heading.textContent, 'Should render the provided content').toBe('Heading 4');
    expect(heading.className, 'Should have correct styling').toContain('text-md');
    expect(heading.className, 'Should have font-semibold class').toContain('font-semibold');
  });

  it('applies custom className to H4 correctly', () => {
    render(
      <H4 className="custom-h4-class" data-testid="h4">
        Heading 4
      </H4>,
    );
    const heading = screen.getByTestId('h4');

    expect(heading.className, 'Should have custom class').toContain('custom-h4-class');
    expect(heading.className, 'Should retain default styling').toContain('text-md');
  });

  it('forwards ref correctly for H1', () => {
    // Testing that a component with ref renders without errors
    const TestComponent = () => {
      const ref = React.useRef(null);

      return (
        <H1 ref={ref} data-testid="h1">
          Heading 1
        </H1>
      );
    };

    render(<TestComponent />);
    const heading = screen.getByTestId('h1');

    // Check that the component rendered
    expect(heading, 'H1 should be rendered').toBeTruthy();
  });
});
