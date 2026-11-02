import { ModalPage } from '@/components/page-templates/modal-page';
import { render, screen } from '../../utils/test-utils';

describe('ModalPage', () => {
  it('renders the page shell and title slots', () => {
    render(
      <ModalPage data-testid="modal-page">
        <ModalPage.Title>Themes</ModalPage.Title>
        <p>Theme content</p>
      </ModalPage>,
    );

    expect(screen.getByTestId('modal-page').getAttribute('data-modal-page')).toBe('root');
    expect(screen.getByRole('heading', { name: 'Themes' }).getAttribute('data-modal-page')).toBe(
      'title',
    );
    expect(screen.getByText('Theme content')).toBeTruthy();
  });

  it('forwards custom classes to each slot', () => {
    render(
      <ModalPage className="max-w-3xl" data-testid="modal-page">
        <ModalPage.Title className="mb-4">Links</ModalPage.Title>
      </ModalPage>,
    );

    expect(screen.getByTestId('modal-page').className).toContain('max-w-3xl');
    expect(screen.getByRole('heading', { name: 'Links' }).className).toContain('mb-4');
  });
});
