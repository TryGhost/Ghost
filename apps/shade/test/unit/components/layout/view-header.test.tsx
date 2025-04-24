import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {ViewHeader, ViewHeaderActions} from '../../../../src/components/layout/view-header';
import {render} from '../../utils/test-utils';

describe('ViewHeader Components', () => {
    it('renders ViewHeader with correct structure and styling', () => {
        render(
            <ViewHeader>
                <div>Header Content</div>
                <ViewHeaderActions>
                    <button>Action 1</button>
                    <button>Action 2</button>
                </ViewHeaderActions>
            </ViewHeader>
        );
        
        // ViewHeader renders a header element
        const header = screen.getByRole('banner');
        assert.ok(header, 'ViewHeader should be rendered');
        assert.equal(header.tagName.toLowerCase(), 'header', 'Should be a header element');
        assert.ok(header.className.includes('sticky top-0'), 'Should have sticky positioning');
        assert.ok(header.className.includes('backdrop-blur-md'), 'Should have backdrop blur');
        
        const headerContent = screen.getByText('Header Content');
        assert.ok(headerContent, 'Header content should be rendered');
        
        const actionButtons = screen.getAllByRole('button');
        assert.equal(actionButtons.length, 2, 'Should render both action buttons');
        assert.equal(actionButtons[0].textContent, 'Action 1', 'First button should have correct text');
        assert.equal(actionButtons[1].textContent, 'Action 2', 'Second button should have correct text');
    });

    it('applies custom className to ViewHeader correctly', () => {
        render(
            <ViewHeader className="custom-header-class">
                <div>Header Content</div>
            </ViewHeader>
        );
        
        const header = screen.getByRole('banner');
        const innerDiv = header.querySelector('div');
        assert.ok(innerDiv?.className.includes('custom-header-class'), 'Should apply custom class to inner div');
    });

    it('renders ViewHeaderActions with correct styling', () => {
        render(
            <ViewHeaderActions>
                <button>Action</button>
            </ViewHeaderActions>
        );
        
        const actions = screen.getByText('Action').parentElement;
        assert.ok(actions, 'ViewHeaderActions should be rendered');
        assert.ok(actions?.className.includes('flex items-center gap-2'), 'Should have flex layout styling');
        
        const button = screen.getByRole('button');
        assert.ok(button, 'Action button should be rendered');
        assert.equal(button.textContent, 'Action', 'Button should have correct text');
    });

    it('renders ViewHeader without actions', () => {
        render(
            <ViewHeader>
                <div>Header Content</div>
            </ViewHeader>
        );
        
        const header = screen.getByRole('banner');
        assert.ok(header, 'ViewHeader should be rendered');
        
        const headerContent = screen.getByText('Header Content');
        assert.ok(headerContent, 'Header content should be rendered');
    });

    it('renders ViewHeader with multiple children in ViewHeaderActions', () => {
        render(
            <ViewHeader>
                <div>Header Content</div>
                <ViewHeaderActions>
                    <button>Action 1</button>
                    <span>Separator</span>
                    <button>Action 2</button>
                </ViewHeaderActions>
            </ViewHeader>
        );
        
        const separator = screen.getByText('Separator');
        assert.ok(separator, 'Separator should be rendered');
        
        const actionButtons = screen.getAllByRole('button');
        assert.equal(actionButtons.length, 2, 'Should render both action buttons');
    });
}); 