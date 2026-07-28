import assert from 'assert/strict';
import {ModalPage} from '@/components/page-templates/modal-page';
import {render, screen} from '../../utils/test-utils';

describe('ModalPage', () => {
    it('renders the page shell and title slots', () => {
        render(
            <ModalPage data-testid='modal-page'>
                <ModalPage.Title>Themes</ModalPage.Title>
                <p>Theme content</p>
            </ModalPage>
        );

        assert.equal(screen.getByTestId('modal-page').getAttribute('data-modal-page'), 'root');
        assert.equal(screen.getByRole('heading', {name: 'Themes'}).getAttribute('data-modal-page'), 'title');
        assert.ok(screen.getByText('Theme content'));
    });

    it('forwards custom classes to each slot', () => {
        render(
            <ModalPage className='max-w-3xl' data-testid='modal-page'>
                <ModalPage.Title className='mb-4'>Links</ModalPage.Title>
            </ModalPage>
        );

        assert.ok(screen.getByTestId('modal-page').className.includes('max-w-3xl'));
        assert.ok(screen.getByRole('heading', {name: 'Links'}).className.includes('mb-4'));
    });
});
