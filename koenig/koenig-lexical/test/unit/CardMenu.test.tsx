import trackEvent from '../../src/utils/analytics';
import {CardMenu} from '../../src/components/ui/CardMenu';
import {expect, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

vi.mock('../../src/utils/analytics', () => ({
    default: vi.fn()
}));

const TestIcon = () => <svg />;

const menu = new Map([
    ['Primary', [{
        Icon: TestIcon,
        insertCommand: 'insert_image',
        label: 'Image'
    }]]
]);

describe('CardMenu', () => {
    beforeEach(() => {
        vi.mocked(trackEvent).mockClear();
    });

    it('tracks plus menu card insertions', () => {
        render(<CardMenu menu={menu} source="plus" />);

        fireEvent.click(screen.getByRole('menuitem', {name: 'Image'}));

        expect(trackEvent).toHaveBeenCalledWith('Card Added', {
            card: 'Image',
            source: 'plus'
        });
    });

    it('tracks slash menu card insertions with the search term', () => {
        render(<CardMenu menu={menu} searchTerm="ima" source="slash" />);

        fireEvent.click(screen.getByRole('menuitem', {name: 'Image'}));

        expect(trackEvent).toHaveBeenCalledWith('Card Added', {
            card: 'Image',
            searchTerm: 'ima',
            source: 'slash'
        });
    });

    it('omits an empty slash menu search term', () => {
        render(<CardMenu menu={menu} searchTerm="" source="slash" />);

        fireEvent.click(screen.getByRole('menuitem', {name: 'Image'}));

        expect(trackEvent).toHaveBeenCalledWith('Card Added', {
            card: 'Image',
            source: 'slash'
        });
    });
});
