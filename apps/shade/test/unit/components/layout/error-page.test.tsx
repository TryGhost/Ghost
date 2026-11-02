import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ErrorPage } from '../../../../src/components/layout/error-page';
import { render } from '../../utils/test-utils';

describe('ErrorPage Component', () => {
  it('renders with correct structure and content', () => {
    render(<ErrorPage data-testid="error-page" />);
    const errorPage = screen.getByTestId('error-page');

    expect(errorPage, 'ErrorPage should be rendered').toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent, 'Should have correct heading text').toBe('Loading interrupted');

    const paragraph = screen.getByText(/They say life is a series of trials and tribulations/);
    expect(paragraph, 'Should render the error message paragraph').toBeTruthy();

    const backLink = screen.getByText(/Back to the dashboard/);
    expect(backLink, 'Should render the back to dashboard link').toBeTruthy();
  });

  it('applies custom className correctly', () => {
    render(<ErrorPage className="custom-error-class" data-testid="error-page" />);
    const errorPage = screen.getByTestId('error-page');

    expect(errorPage.className, 'Should have custom class').toContain('custom-error-class');
    expect(errorPage.className, 'Should retain default styling').toContain('h-screen');
  });

  it('calls onBackToDashboard when back link is clicked', () => {
    const handleBackToDashboard = vi.fn();
    render(<ErrorPage data-testid="error-page" onBackToDashboard={handleBackToDashboard} />);

    const backLink = screen.getByText(/Back to the dashboard/);
    fireEvent.click(backLink);

    expect(handleBackToDashboard.mock.calls.length, 'onBackToDashboard should be called once').toBe(
      1,
    );
  });

  it('passes additional props to the outer div', () => {
    render(<ErrorPage aria-label="Error message" data-testid="error-page" id="custom-id" />);
    const errorPage = screen.getByTestId('error-page');

    expect(errorPage.id, 'Should have custom id attribute').toBe('custom-id');
    expect(errorPage.getAttribute('aria-label'), 'Should have custom aria-label attribute').toBe(
      'Error message',
    );
  });
});
