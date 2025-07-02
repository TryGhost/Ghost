import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {Page} from '../../../../src/components/layout/page';
import {render} from '../../utils/test-utils';

describe('Page Component', () => {
    it('renders with correct structure and styling', () => {
        render(<Page data-testid="page">Page Content</Page>);
        const page = screen.getByTestId('page');
        
        assert.ok(page, 'Page should be rendered');
        assert.equal(page.tagName.toLowerCase(), 'div', 'Should be a div element');
        assert.equal(page.textContent, 'Page Content', 'Should render its content');
        
        assert.ok(page.className.includes('max-w-page'), 'Should have max width class');
        assert.ok(page.className.includes('w-full'), 'Should have full width class');
        assert.ok(page.className.includes('flex flex-col'), 'Should have flex column layout');
    });

    it('applies custom className correctly', () => {
        render(<Page className="custom-page-class" data-testid="page">Page Content</Page>);
        const page = screen.getByTestId('page');
        
        assert.ok(page.className.includes('custom-page-class'), 'Should have custom class');
        assert.ok(page.className.includes('max-w-page'), 'Should retain default styling');
    });

    it('renders children correctly', () => {
        render(
            <Page data-testid="page">
                <h1>Page Title</h1>
                <p>Page paragraph</p>
                <button>Page button</button>
            </Page>
        );
        
        assert.ok(screen.getByRole('heading', {level: 1}), 'Should render heading');
        assert.equal(screen.getByRole('heading', {level: 1}).textContent, 'Page Title', 'Heading should have correct text');
        
        assert.ok(screen.getByText('Page paragraph'), 'Should render paragraph');
        
        const button = screen.getByRole('button');
        assert.ok(button, 'Should render button');
        assert.equal(button.textContent, 'Page button', 'Button should have correct text');
    });

    it('passes additional props to the div element', () => {
        render(
            <Page 
                data-testid="page" 
                id="test-page-id"
                aria-label="Test page"
            >
                Page Content
            </Page>
        );
        
        const page = screen.getByTestId('page');
        assert.equal(page.id, 'test-page-id', 'Should have correct id attribute');
        assert.equal(page.getAttribute('aria-label'), 'Test page', 'Should have correct aria-label attribute');
    });
}); 