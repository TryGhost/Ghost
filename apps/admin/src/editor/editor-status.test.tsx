import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorStatus, RecipientCount } from './editor-status';

const mocks = vi.hoisted(() => ({
  useMembersCount: vi.fn(() => ({ count: null })),
  useBrowseSettings: vi.fn(() => ({ data: { settings: [] } })),
}));

vi.mock('@tryghost/admin-x-framework/api/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/members')>();
  return {
    ...actual,
    useMembersCount: mocks.useMembersCount,
  };
});

vi.mock('@tryghost/admin-x-framework/api/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/settings')>();
  return {
    ...actual,
    useBrowseSettings: mocks.useBrowseSettings,
  };
});

// The status line shares its count and settings keys with the publish flow, so
// the refetches it initiates have to opt out of the session-expiry redirect too.
const OPTED_OUT = { requestOptions: { sessionExpiryRedirect: false } };

describe('RecipientCount', () => {
  it('keeps descriptive copy when the member count is unavailable', () => {
    const filter = 'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)';

    render(<RecipientCount filter={filter} segment="status:free,status:-free" />);

    expect(screen.getByText('all members')).toBeInTheDocument();
    expect(mocks.useMembersCount).toHaveBeenCalledWith(filter, OPTED_OUT);
  });
});

describe('EditorStatus', () => {
  it('reads its timezone setting without the global error handler or the redirect', () => {
    render(<EditorStatus isDirty={false} state={{ kind: 'idle' }} />);

    expect(mocks.useBrowseSettings).toHaveBeenCalledWith({
      defaultErrorHandler: false,
      ...OPTED_OUT,
    });
  });
});
