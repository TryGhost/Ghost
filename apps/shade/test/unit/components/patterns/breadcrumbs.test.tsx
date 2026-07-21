import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {Breadcrumbs} from '../../../../src/components/patterns/breadcrumbs';
import {render} from '../../utils/test-utils';

describe('Breadcrumbs', () => {
    it('renders ancestor items and the current page', () => {
        render(<Breadcrumbs current='Black Friday' items={[{label: 'Offers', onClick: () => {}}]} />);

        assert.ok(screen.getByText('Offers'));
        const current = screen.getByText('Black Friday');
        assert.equal(current.getAttribute('aria-current'), 'page');
    });

    it('renders onClick-only items as native buttons and fires the handler', () => {
        const handleClick = vi.fn();
        render(<Breadcrumbs current='Black Friday' items={[{label: 'Offers', onClick: handleClick}]} />);

        const crumb = screen.getByRole('button', {name: 'Offers'});
        assert.equal(crumb.tagName, 'BUTTON');
        assert.equal(crumb.getAttribute('type'), 'button');
        fireEvent.click(crumb);
        assert.equal(handleClick.mock.calls.length, 1);
    });

    it('renders items as links when given an href', () => {
        render(<Breadcrumbs current='Jamie Larson' items={[{label: 'Members', href: '/members'}]} />);

        assert.equal(screen.getByText('Members').getAttribute('href'), '/members');
    });

    it('only renders the back button when onBack is provided', () => {
        const {rerender} = render(<Breadcrumbs current='Post analytics' items={[{label: 'Analytics'}]} />);
        assert.equal(screen.queryByRole('button', {name: 'Back'}), null);

        const handleBack = vi.fn();
        rerender(<Breadcrumbs current='Post analytics' items={[{label: 'Analytics'}]} onBack={handleBack} />);

        fireEvent.click(screen.getByRole('button', {name: 'Back'}));
        assert.equal(handleBack.mock.calls.length, 1);
    });

    it('forwards className to the root element', () => {
        const {container} = render(<Breadcrumbs className='custom-class' current='Page' items={[]} />);

        assert.ok((container.firstElementChild as HTMLElement).className.includes('custom-class'));
    });
});
