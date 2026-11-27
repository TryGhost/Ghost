import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Indicator } from '../../../../src/components/ui/indicator';
import { render } from '../../utils/test-utils';

describe('Indicator Component', () => {
  it('renders correctly with default props', () => {
    render(<Indicator data-testid="indicator" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(container, 'Indicator container should be rendered').toBeTruthy();
    expect(indicator, 'Indicator dot should be rendered').toBeTruthy();
    expect(indicator?.className, 'Should have success variant class by default').toContain(
      'bg-state-success',
    );
    expect(indicator?.className, 'Should have small size by default').toContain('size-2');
    expect(indicator?.className, 'Should not be pulsing in idle state').not.toContain(
      'animate-pulse',
    );
    expect(indicator?.className, 'Should not have border in idle state').not.toContain('border');
  });

  it('applies neutral variant correctly', () => {
    render(<Indicator data-testid="indicator" variant="neutral" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have neutral variant class').toContain('bg-muted');
  });

  it('applies info variant correctly', () => {
    render(<Indicator data-testid="indicator" variant="info" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have info variant class').toContain('bg-state-info');
  });

  it('applies success variant correctly', () => {
    render(<Indicator data-testid="indicator" variant="success" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have success variant class').toContain('bg-state-success');
  });

  it('applies error variant correctly', () => {
    render(<Indicator data-testid="indicator" variant="error" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have error variant class').toContain('bg-state-danger');
  });

  it('applies warning variant correctly', () => {
    render(<Indicator data-testid="indicator" variant="warning" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have warning variant class').toContain('bg-state-warning');
  });

  it('applies idle state correctly', () => {
    render(<Indicator data-testid="indicator" state="idle" variant="success" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have solid background').toContain('bg-state-success');
    expect(indicator?.className, 'Should not be pulsing in idle state').not.toContain(
      'animate-pulse',
    );
    expect(indicator?.className, 'Should not have border').not.toContain('border');
  });

  it('applies active state correctly', () => {
    render(<Indicator data-testid="indicator" state="active" variant="success" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have pulsing animation class').toContain('animate-pulse');
    expect(indicator?.className, 'Should maintain variant color').toContain('bg-state-success');
  });

  it('applies inactive state with neutral variant correctly', () => {
    render(<Indicator data-testid="indicator" state="inactive" variant="neutral" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have border class').toContain('border');
    expect(indicator?.className, 'Should have transparent background class').toContain(
      'bg-transparent',
    );
    expect(indicator?.className, 'Should have grey border for neutral variant').toContain(
      'border-muted-foreground',
    );
  });

  it('applies inactive state with info variant correctly', () => {
    render(<Indicator data-testid="indicator" state="inactive" variant="info" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have border class').toContain('border');
    expect(indicator?.className, 'Should have transparent background class').toContain(
      'bg-transparent',
    );
    expect(indicator?.className, 'Should have info border variant').toContain('border-state-info');
  });

  it('applies inactive state with success variant correctly', () => {
    render(<Indicator data-testid="indicator" state="inactive" variant="success" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have border class').toContain('border');
    expect(indicator?.className, 'Should have transparent background class').toContain(
      'bg-transparent',
    );
    expect(indicator?.className, 'Should have success border variant').toContain(
      'border-state-success',
    );
  });

  it('applies inactive state with error variant correctly', () => {
    render(<Indicator data-testid="indicator" state="inactive" variant="error" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have border class').toContain('border');
    expect(indicator?.className, 'Should have transparent background class').toContain(
      'bg-transparent',
    );
    expect(indicator?.className, 'Should have error border variant').toContain(
      'border-state-danger',
    );
  });

  it('applies inactive state with warning variant correctly', () => {
    render(<Indicator data-testid="indicator" state="inactive" variant="warning" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have border class').toContain('border');
    expect(indicator?.className, 'Should have transparent background class').toContain(
      'bg-transparent',
    );
    expect(indicator?.className, 'Should have warning border variant').toContain(
      'border-state-warning',
    );
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<Indicator data-testid="indicator" size="sm" />);
    let container = screen.getByTestId('indicator');
    let indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator?.className, 'Should have small size class').toContain('size-2');

    rerender(<Indicator data-testid="indicator" size="md" />);
    container = screen.getByTestId('indicator');
    indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator?.className, 'Should have medium size class').toContain('size-3');

    rerender(<Indicator data-testid="indicator" size="lg" />);
    container = screen.getByTestId('indicator');
    indicator = container.querySelector('[aria-hidden="true"]');
    expect(indicator?.className, 'Should have large size class').toContain('size-4');
  });

  it('combines variant and state correctly', () => {
    render(<Indicator data-testid="indicator" state="active" variant="error" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have error variant color').toContain('bg-state-danger');
    expect(indicator?.className, 'Should have active animation').toContain('animate-pulse');
  });

  it('applies custom className correctly', () => {
    render(<Indicator className="custom-class" data-testid="indicator" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator?.className, 'Should have custom class').toContain('custom-class');
  });

  it('renders screen reader label when provided', () => {
    render(<Indicator label="Test label" />);
    const srLabel = screen.getByText('Test label');

    expect(srLabel, 'Screen reader label should be rendered').toBeTruthy();
    expect(srLabel.className, 'Should have sr-only class').toContain('sr-only');
  });

  it('does not render screen reader label when not provided', () => {
    const { container } = render(<Indicator data-testid="indicator" />);
    const srLabels = container.querySelectorAll('.sr-only');

    expect(srLabels.length, 'Should not render screen reader label').toBe(0);
  });

  it('sets aria-hidden on the indicator dot', () => {
    render(<Indicator data-testid="indicator" />);
    const container = screen.getByTestId('indicator');
    const indicator = container.querySelector('[aria-hidden="true"]');

    expect(indicator, 'Indicator dot should exist').toBeTruthy();
    expect(indicator?.getAttribute('aria-hidden'), 'Should have aria-hidden attribute on dot').toBe(
      'true',
    );
  });

  it('passes additional props to the container span element', () => {
    render(<Indicator data-custom="value" data-testid="indicator-test" />);
    const container = screen.getByTestId('indicator-test');

    expect(container.getAttribute('data-custom'), 'Should pass additional props to container').toBe(
      'value',
    );
  });
});
