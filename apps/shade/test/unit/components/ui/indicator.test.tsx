import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {Indicator} from '../../../../src/components/ui/indicator';
import {render} from '../../utils/test-utils';

describe('Indicator Component', () => {
    it('renders correctly with default props', () => {
        render(<Indicator data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(container, 'Indicator container should be rendered');
        assert.ok(indicator, 'Indicator dot should be rendered');
        assert.ok(indicator?.className.includes('bg-green-500'), 'Should have success variant class by default');
        assert.ok(indicator?.className.includes('size-2'), 'Should have small size by default');
        assert.ok(!indicator?.className.includes('animate-pulse'), 'Should not be pulsing in idle state');
        assert.ok(!indicator?.className.includes('border'), 'Should not have border in idle state');
    });

    it('applies neutral variant correctly', () => {
        render(<Indicator data-testid="indicator" variant="neutral" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-muted'), 'Should have neutral variant class');
    });

    it('applies info variant correctly', () => {
        render(<Indicator data-testid="indicator" variant="info" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-blue-500'), 'Should have info variant class');
    });

    it('applies success variant correctly', () => {
        render(<Indicator data-testid="indicator" variant="success" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-green-500'), 'Should have success variant class');
    });

    it('applies error variant correctly', () => {
        render(<Indicator variant="error" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-red-500'), 'Should have error variant class');
    });

    it('applies warning variant correctly', () => {
        render(<Indicator variant="warning" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-yellow-500'), 'Should have warning variant class');
    });

    it('applies idle state correctly', () => {
        render(<Indicator variant="success" state="idle" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-green-500'), 'Should have solid background');
        assert.ok(!indicator?.className.includes('animate-pulse'), 'Should not be pulsing in idle state');
        assert.ok(!indicator?.className.includes('border'), 'Should not have border');
    });

    it('applies active state correctly', () => {
        render(<Indicator variant="success" state="active" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('animate-pulse'), 'Should have pulsing animation class');
        assert.ok(indicator?.className.includes('bg-green-500'), 'Should maintain variant color');
    });

    it('applies inactive state with neutral variant correctly', () => {
        render(<Indicator data-testid="indicator" state="inactive" variant="neutral" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('border'), 'Should have border class');
        assert.ok(indicator?.className.includes('bg-transparent'), 'Should have transparent background class');
        assert.ok(indicator?.className.includes('border-muted-foreground'), 'Should have grey border for neutral variant');
    });

    it('applies inactive state with info variant correctly', () => {
        render(<Indicator data-testid="indicator" state="inactive" variant="info" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('border'), 'Should have border class');
        assert.ok(indicator?.className.includes('bg-transparent'), 'Should have transparent background class');
        assert.ok(indicator?.className.includes('border-blue-500'), 'Should have blue border for info variant');
    });

    it('applies inactive state with success variant correctly', () => {
        render(<Indicator data-testid="indicator" state="inactive" variant="success" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('border'), 'Should have border class');
        assert.ok(indicator?.className.includes('bg-transparent'), 'Should have transparent background class');
        assert.ok(indicator?.className.includes('border-green-500'), 'Should have green border for success variant');
    });

    it('applies inactive state with error variant correctly', () => {
        render(<Indicator variant="error" state="inactive" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('border'), 'Should have border class');
        assert.ok(indicator?.className.includes('bg-transparent'), 'Should have transparent background class');
        assert.ok(indicator?.className.includes('border-red-500'), 'Should have red border for error variant');
    });

    it('applies inactive state with warning variant correctly', () => {
        render(<Indicator variant="warning" state="inactive" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('border'), 'Should have border class');
        assert.ok(indicator?.className.includes('bg-transparent'), 'Should have transparent background class');
        assert.ok(indicator?.className.includes('border-yellow-500'), 'Should have yellow border for warning variant');
    });

    it('applies different sizes correctly', () => {
        const {rerender} = render(<Indicator size="sm" data-testid="indicator" />);
        let container = screen.getByTestId('indicator');
        let indicator = container.querySelector('[aria-hidden="true"]');
        assert.ok(indicator?.className.includes('size-2'), 'Should have small size class');

        rerender(<Indicator size="md" data-testid="indicator" />);
        container = screen.getByTestId('indicator');
        indicator = container.querySelector('[aria-hidden="true"]');
        assert.ok(indicator?.className.includes('size-3'), 'Should have medium size class');

        rerender(<Indicator size="lg" data-testid="indicator" />);
        container = screen.getByTestId('indicator');
        indicator = container.querySelector('[aria-hidden="true"]');
        assert.ok(indicator?.className.includes('size-4'), 'Should have large size class');
    });

    it('combines variant and state correctly', () => {
        render(<Indicator variant="error" state="active" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('bg-red-500'), 'Should have error variant color');
        assert.ok(indicator?.className.includes('animate-pulse'), 'Should have active animation');
    });

    it('applies custom className correctly', () => {
        render(<Indicator className="custom-class" data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator?.className.includes('custom-class'), 'Should have custom class');
    });

    it('renders screen reader label when provided', () => {
        render(<Indicator label="Test label" />);
        const srLabel = screen.getByText('Test label');

        assert.ok(srLabel, 'Screen reader label should be rendered');
        assert.ok(srLabel.className.includes('sr-only'), 'Should have sr-only class');
    });

    it('does not render screen reader label when not provided', () => {
        const {container} = render(<Indicator data-testid="indicator" />);
        const srLabels = container.querySelectorAll('.sr-only');

        assert.equal(srLabels.length, 0, 'Should not render screen reader label');
    });

    it('sets aria-hidden on the indicator dot', () => {
        render(<Indicator data-testid="indicator" />);
        const container = screen.getByTestId('indicator');
        const indicator = container.querySelector('[aria-hidden="true"]');

        assert.ok(indicator, 'Indicator dot should exist');
        assert.equal(indicator?.getAttribute('aria-hidden'), 'true', 'Should have aria-hidden attribute on dot');
    });

    it('passes additional props to the container span element', () => {
        render(<Indicator data-testid="indicator-test" data-custom="value" />);
        const container = screen.getByTestId('indicator-test');

        assert.equal(container.getAttribute('data-custom'), 'value', 'Should pass additional props to container');
    });
});
