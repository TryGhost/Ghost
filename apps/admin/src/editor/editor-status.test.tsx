import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorStatus, RecipientCount } from './editor-status';

vi.mock('./use-editor-settings', () => ({ useSiteTimezone: () => 'Etc/UTC' }));

const mocks = vi.hoisted(() => ({
  useMembersCount: vi.fn(() => ({ count: null })),
}));

vi.mock('@tryghost/admin-x-framework/api/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/members')>();
  return {
    ...actual,
    useMembersCount: mocks.useMembersCount,
  };
});

// The status line shares its count key with the publish flow, so the refetches
// it initiates have to opt out of the session-expiry redirect too.
const OPTED_OUT = { requestOptions: { sessionExpiryRedirect: false } };

describe('EditorStatus', () => {
  it('starts the saving indicator only after preparation succeeds', () => {
    const { rerender } = render(
      <EditorStatus state={{ kind: 'preparing', intent: 'autosave' }} isDirty />,
    );
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    rerender(<EditorStatus state={{ kind: 'idle' }} isDirty />);
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    rerender(<EditorStatus state={{ kind: 'saving', intent: 'autosave' }} isDirty />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });
});

describe('RecipientCount', () => {
  it('keeps descriptive copy when the member count is unavailable', () => {
    const filter = 'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)';

    render(<RecipientCount filter={filter} segment="status:free,status:-free" />);

    expect(screen.getByText('all members')).toBeInTheDocument();
    expect(mocks.useMembersCount).toHaveBeenCalledWith(filter, OPTED_OUT);
  });
});
