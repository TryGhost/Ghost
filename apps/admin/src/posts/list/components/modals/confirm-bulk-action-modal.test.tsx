import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmBulkActionModal } from './confirm-bulk-action-modal';

function renderModal(isRunning: boolean, onCancel = vi.fn()) {
  render(
    <ConfirmBulkActionModal
      action="delete"
      count={1}
      isRunning={isRunning}
      resource="posts"
      title="Test post"
      onCancel={onCancel}
      onConfirm={vi.fn()}
    />,
  );

  return onCancel;
}

describe('ConfirmBulkActionModal', () => {
  it('blocks Escape dismissal while the action is running', () => {
    const onCancel = renderModal(true);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('allows Escape dismissal when the action is idle', () => {
    const onCancel = renderModal(false);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
