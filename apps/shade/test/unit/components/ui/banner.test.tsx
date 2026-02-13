/* eslint-disable ghost/mocha/no-setup-in-describe */
import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {Banner} from '../../../../src/components/ui/banner';
import {render} from '../../utils/test-utils';

/**
 * TypeScript's discriminated union enforces onDismiss requirement at compile-time
 * when dismissible={true}, so invalid combinations aren't tested here.
 */
describe('Banner Component', () => {
    it('renders children correctly', () => {
        render(<Banner>Test content</Banner>);
        const content = screen.getByText('Test content');

        assert.ok(content, 'Banner should render children');
    });

    it('applies default variant and size classes', () => {
        render(<Banner>Content</Banner>);
        const banner = screen.getByRole('status');

        assert.ok(banner, 'Banner should be rendered with default role');
        assert.ok(banner.className.includes('bg-background'), 'Should have default variant class');
    });

    it.each([
        {variant: 'info' as const, expectedClass: 'bg-blue-50'},
        {variant: 'success' as const, expectedClass: 'bg-green-50'},
        {variant: 'warning' as const, expectedClass: 'bg-yellow-50'},
        {variant: 'destructive' as const, expectedClass: 'bg-white'}
    ])('applies $variant variant correctly', ({variant, expectedClass}) => {
        render(<Banner variant={variant}>Content</Banner>);
        const banner = screen.getByRole('status');

        assert.ok(banner.className.includes(expectedClass), `Should have ${expectedClass} class`);
    });

    it('applies gradient variant correctly', () => {
        render(<Banner variant="gradient">Content</Banner>);
        const banner = screen.getByRole('status');

        assert.ok(banner.className.includes('bg-white'), 'Should have gradient variant class');
        assert.ok(banner.className.includes('cursor-pointer'), 'Gradient variant should be clickable');
    });

    it.each([
        {size: 'sm' as const, expectedClass: 'p-2'},
        {size: 'lg' as const, expectedClass: 'p-4'}
    ])('applies $size size correctly', ({size, expectedClass}) => {
        render(<Banner size={size}>Content</Banner>);
        const banner = screen.getByRole('status');

        assert.ok(banner.className.includes(expectedClass), `Should have ${expectedClass} class`);
    });

    it('applies correct role by default', () => {
        render(<Banner>Content</Banner>);
        const banner = screen.getByRole('status');

        assert.equal(banner.getAttribute('role'), 'status', 'Should have status role by default');
        // Note: role="status" has implicit aria-live="polite", no need to set explicitly
    });

    it('applies custom role', () => {
        render(<Banner role="alert">Content</Banner>);
        const banner = screen.getByRole('alert');

        assert.equal(banner.getAttribute('role'), 'alert', 'Should have alert role');
        // Note: role="alert" has implicit aria-live="assertive"
    });

    it('allows overriding ARIA attributes via standard props', () => {
        render(
            <Banner
                role="region"
                aria-live="assertive"
                aria-label="Test banner"
            >
                Content
            </Banner>
        );

        const banner = screen.getByRole('region');
        assert.equal(banner.getAttribute('role'), 'region', 'Should have region role');
        assert.equal(banner.getAttribute('aria-live'), 'assertive', 'Should have assertive aria-live');
        assert.equal(banner.getAttribute('aria-label'), 'Test banner', 'Should have custom aria-label');
    });

    describe('Non-dismissible variant', () => {
        it.each([
            {dismissible: undefined, description: 'not set'},
            {dismissible: false as const, description: 'explicitly false'}
        ])('does not show dismiss button when dismissible is $description', ({dismissible}) => {
            render(<Banner dismissible={dismissible}>Content</Banner>);
            const dismissButton = screen.queryByLabelText('Dismiss notification');

            assert.equal(dismissButton, null, 'Dismiss button should not be rendered');
        });
    });

    describe('Dismissible variant', () => {
        it('shows dismiss button when dismissible (requires onDismiss)', () => {
            const onDismiss = vi.fn();
            render(<Banner dismissible onDismiss={onDismiss}>Content</Banner>);
            const dismissButton = screen.getByLabelText('Dismiss notification');

            assert.ok(dismissButton, 'Dismiss button should be rendered');
        });

        it('calls onDismiss when close button clicked', () => {
            const onDismiss = vi.fn();
            render(<Banner dismissible onDismiss={onDismiss}>Content</Banner>);

            const dismissButton = screen.getByLabelText('Dismiss notification');
            fireEvent.click(dismissButton);

            assert.equal(onDismiss.mock.calls.length, 1, 'onDismiss should be called once');
        });

        it('maintains stateless behavior - parent manages visibility', () => {
            const onDismiss = vi.fn();
            render(<Banner dismissible onDismiss={onDismiss}>Content</Banner>);

            const dismissButton = screen.getByLabelText('Dismiss notification');
            fireEvent.click(dismissButton);

            // Component is stateless, so it should still be visible after dismiss
            // Parent component is responsible for hiding/removing it
            const content = screen.getByText('Content');
            assert.ok(content, 'Banner should still be rendered (parent manages visibility)');
            assert.equal(onDismiss.mock.calls.length, 1, 'onDismiss should be called once');
        });

        it('prevents propagation on dismiss click', () => {
            const parentClick = vi.fn();
            const onDismiss = vi.fn();
            render(
                <div onClick={parentClick}>
                    <Banner dismissible onDismiss={onDismiss}>Content</Banner>
                </div>
            );

            const dismissButton = screen.getByLabelText('Dismiss notification');
            fireEvent.click(dismissButton);

            assert.equal(parentClick.mock.calls.length, 0, 'Parent click handler should not be called');
        });
    });

    it('allows parent click handler when clicking banner content', () => {
        const bannerClick = vi.fn();
        render(<Banner onClick={bannerClick}>Content</Banner>);

        const banner = screen.getByRole('status');
        fireEvent.click(banner);

        assert.equal(bannerClick.mock.calls.length, 1, 'Banner click handler should be called');
    });

    it('applies custom className', () => {
        render(<Banner className="custom-class">Content</Banner>);
        const banner = screen.getByRole('status');

        assert.ok(banner.className.includes('custom-class'), 'Should apply custom className');
    });

    it('forwards ref correctly', () => {
        const ref = {current: null};
        render(<Banner ref={ref as any}>Content</Banner>);

        assert.ok(ref.current, 'Ref should be forwarded');
    });

    it('renders with region role when specified', () => {
        render(<Banner role="region" aria-label="Important region">Content</Banner>);
        const banner = screen.getByRole('region');

        assert.ok(banner, 'Banner should render with region role');
        assert.equal(banner.getAttribute('aria-label'), 'Important region', 'Should have aria-label for region');
    });

    it('supports all HTML div attributes', () => {
        render(
            <Banner
                data-testid="test-banner"
                id="banner-id"
                style={{marginTop: '10px'}}
            >
                Content
            </Banner>
        );

        const banner = screen.getByRole('status');
        assert.equal(banner.getAttribute('data-testid'), 'test-banner', 'Should support data attributes');
        assert.equal(banner.getAttribute('id'), 'banner-id', 'Should support id attribute');
        assert.ok(banner.style.marginTop, 'Should support style attribute');
    });
});
