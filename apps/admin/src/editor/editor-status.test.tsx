import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecipientCount } from './editor-status';

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

describe('RecipientCount', () => {
  it('keeps descriptive copy when the member count is unavailable', () => {
    const filter = 'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)';

    render(<RecipientCount filter={filter} segment="status:free,status:-free" />);

    expect(screen.getByText('all members')).toBeInTheDocument();
    expect(mocks.useMembersCount).toHaveBeenCalledWith(filter);
  });
});
