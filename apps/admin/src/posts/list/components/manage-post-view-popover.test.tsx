import { ManagePostViewPopover } from './manage-post-view-popover';
import type { SharedView } from '@/members/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const savePostView = vi.fn();
const deletePostView = vi.fn();
const navigate = vi.fn();

vi.mock('@/posts/list/hooks/use-post-views', () => ({
  useSavePostView: () => savePostView,
  useDeletePostView: () => deletePostView,
}));

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useNavigate: () => navigate,
}));

const activeView: SharedView = {
  name: 'Blog posts',
  route: 'posts',
  color: 'orange',
  filter: { tag: 'blog' },
};

function openView() {
  render(
    <ManagePostViewPopover activeView={activeView} params={{ tag: 'blog' }} resource="posts" />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit view' }));
}

describe('ManagePostViewPopover deletion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requires confirmation before deleting and navigates back after success', async () => {
    let finishDeletion = () => {};
    deletePostView.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDeletion = resolve;
      }),
    );
    openView();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Delete view?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();
    expect(deletePostView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deletePostView).toHaveBeenCalledExactlyOnceWith(activeView);
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(navigate).not.toHaveBeenCalled();

    finishDeletion();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/posts'));
    expect(screen.queryByText('Delete view?')).not.toBeInTheDocument();
  });

  it('returns to editing when confirmation is cancelled, preserving unsaved changes', () => {
    openView();
    fireEvent.change(screen.getByRole('textbox', { name: 'View name' }), {
      target: { value: 'Renamed view' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'View name' }), { key: 'Enter' });

    expect(savePostView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete view?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'View name' })).toHaveValue('Renamed view');
    expect(deletePostView).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('resets confirmation when the popover is dismissed and reopened', () => {
    openView();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'View name' }), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit view' }));

    expect(screen.queryByText('Delete view?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeInTheDocument();
    expect(deletePostView).not.toHaveBeenCalled();
  });

  it('keeps the confirmation open and allows retrying a failed deletion', async () => {
    deletePostView.mockRejectedValueOnce(new Error('Could not delete view'));
    openView();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete view');
    expect(screen.getByText('Delete view?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/posts'));
    expect(deletePostView).toHaveBeenCalledTimes(2);
  });
});
