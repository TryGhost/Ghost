import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {screen, fireEvent} from '@testing-library/react';
import {ErrorPage} from '../../../../src/components/layout/error-page';
import {render} from '../../utils/test-utils';

describe('ErrorPage Component', () => {
    it('renders with correct structure and content', () => {
        render(<ErrorPage data-testid="error-page" />);
        const errorPage = screen.getByTestId('error-page');
        
        assert.ok(errorPage, 'ErrorPage should be rendered');
        assert.ok(errorPage.className.includes('admin-x-container-error'), 'Should have correct className');
        
        const heading = screen.getByRole('heading', {level: 1});
        assert.equal(heading.textContent, 'Loading interrupted', 'Should have correct heading text');
        
        const paragraph = screen.getByText(/They say life is a series of trials and tribulations/);
        assert.ok(paragraph, 'Should render the error message paragraph');
        
        const backLink = screen.getByText(/Back to the dashboard/);
        assert.ok(backLink, 'Should render the back to dashboard link');
    });

    it('applies custom className correctly', () => {
        render(<ErrorPage className="custom-error-class" data-testid="error-page" />);
        const errorPage = screen.getByTestId('error-page');
        
        assert.ok(errorPage.className.includes('custom-error-class'), 'Should have custom class');
        assert.ok(errorPage.className.includes('admin-x-container-error'), 'Should retain default styling');
    });

    it('calls onBackToDashboard when back link is clicked', () => {
        const handleBackToDashboard = vi.fn();
        render(
            <ErrorPage 
                onBackToDashboard={handleBackToDashboard} 
                data-testid="error-page" 
            />
        );
        
        const backLink = screen.getByText(/Back to the dashboard/);
        fireEvent.click(backLink);
        
        assert.equal(handleBackToDashboard.mock.calls.length, 1, 'onBackToDashboard should be called once');
    });

    it('passes additional props to the outer div', () => {
        render(<ErrorPage id="custom-id" aria-label="Error message" data-testid="error-page" />);
        const errorPage = screen.getByTestId('error-page');
        
        assert.equal(errorPage.id, 'custom-id', 'Should have custom id attribute');
        assert.equal(errorPage.getAttribute('aria-label'), 'Error message', 'Should have custom aria-label attribute');
    });
}); 