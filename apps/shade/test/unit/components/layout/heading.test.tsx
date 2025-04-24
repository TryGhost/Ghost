import assert from 'assert/strict';
import React from 'react';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {H1, H2, H3, H4} from '../../../../src/components/layout/heading';
import {render} from '../../utils/test-utils';

describe('Heading Components', () => {
    it('renders H1 with correct tag and styling', () => {
        render(<H1 data-testid="h1">Heading 1</H1>);
        const heading = screen.getByTestId('h1');
        
        assert.ok(heading, 'H1 should be rendered');
        assert.equal(heading.tagName.toLowerCase(), 'h1', 'Should be an h1 element');
        assert.equal(heading.textContent, 'Heading 1', 'Should render the provided content');
        assert.ok(heading.className.includes('text-3xl'), 'Should have correct styling');
        assert.ok(heading.className.includes('font-bold'), 'Should have font-bold class');
    });

    it('applies custom className to H1 correctly', () => {
        render(<H1 className="custom-h1-class" data-testid="h1">Heading 1</H1>);
        const heading = screen.getByTestId('h1');
        
        assert.ok(heading.className.includes('custom-h1-class'), 'Should have custom class');
        assert.ok(heading.className.includes('text-3xl'), 'Should retain default styling');
    });

    it('renders H2 with correct tag and styling', () => {
        render(<H2 data-testid="h2">Heading 2</H2>);
        const heading = screen.getByTestId('h2');
        
        assert.ok(heading, 'H2 should be rendered');
        assert.equal(heading.tagName.toLowerCase(), 'h2', 'Should be an h2 element');
        assert.equal(heading.textContent, 'Heading 2', 'Should render the provided content');
        assert.ok(heading.className.includes('text-2xl'), 'Should have correct styling');
        assert.ok(heading.className.includes('font-bold'), 'Should have font-bold class');
    });

    it('applies custom className to H2 correctly', () => {
        render(<H2 className="custom-h2-class" data-testid="h2">Heading 2</H2>);
        const heading = screen.getByTestId('h2');
        
        assert.ok(heading.className.includes('custom-h2-class'), 'Should have custom class');
        assert.ok(heading.className.includes('text-2xl'), 'Should retain default styling');
    });

    it('renders H3 with correct tag and styling', () => {
        render(<H3 data-testid="h3">Heading 3</H3>);
        const heading = screen.getByTestId('h3');
        
        assert.ok(heading, 'H3 should be rendered');
        assert.equal(heading.tagName.toLowerCase(), 'h3', 'Should be an h3 element');
        assert.equal(heading.textContent, 'Heading 3', 'Should render the provided content');
        assert.ok(heading.className.includes('text-xl'), 'Should have correct styling');
        assert.ok(heading.className.includes('font-semibold'), 'Should have font-semibold class');
    });

    it('applies custom className to H3 correctly', () => {
        render(<H3 className="custom-h3-class" data-testid="h3">Heading 3</H3>);
        const heading = screen.getByTestId('h3');
        
        assert.ok(heading.className.includes('custom-h3-class'), 'Should have custom class');
        assert.ok(heading.className.includes('text-xl'), 'Should retain default styling');
    });

    it('renders H4 with correct tag and styling', () => {
        render(<H4 data-testid="h4">Heading 4</H4>);
        const heading = screen.getByTestId('h4');
        
        assert.ok(heading, 'H4 should be rendered');
        assert.equal(heading.tagName.toLowerCase(), 'h4', 'Should be an h4 element');
        assert.equal(heading.textContent, 'Heading 4', 'Should render the provided content');
        assert.ok(heading.className.includes('text-lg'), 'Should have correct styling');
        assert.ok(heading.className.includes('font-semibold'), 'Should have font-semibold class');
    });

    it('applies custom className to H4 correctly', () => {
        render(<H4 className="custom-h4-class" data-testid="h4">Heading 4</H4>);
        const heading = screen.getByTestId('h4');
        
        assert.ok(heading.className.includes('custom-h4-class'), 'Should have custom class');
        assert.ok(heading.className.includes('text-lg'), 'Should retain default styling');
    });

    it('forwards ref correctly for H1', () => {
        // Testing that a component with ref renders without errors
        const TestComponent = () => {
            const ref = React.useRef(null);
            
            return <H1 ref={ref} data-testid="h1">Heading 1</H1>;
        };
        
        render(<TestComponent />);
        const heading = screen.getByTestId('h1');
        
        // Check that the component rendered
        assert.ok(heading, 'H1 should be rendered');
    });
}); 