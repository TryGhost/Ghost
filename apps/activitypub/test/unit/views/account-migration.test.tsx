import AccountMigration from '../../../src/views/preferences/components/account-migration';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  account: {
    data: { handle: '@index@ghost.example' } as { handle: string } | undefined,
    isLoading: false,
  },
  migration: {
    data: { targetApId: null as string | null, sent: false } as
      | { targetApId: string | null; sent: boolean }
      | undefined,
    isError: false,
    isLoading: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  move: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('@src/components/layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useAccountForUser: () => mocks.account,
  useAccountAliasesForUser: () => ({
    data: { aliases: [], destination: { handle: '@index@ghost.example' } },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAddAccountAliasMutationForUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveAccountAliasMutationForUser: () => ({ mutateAsync: vi.fn() }),
  useAccountMigrationForUser: () => mocks.migration,
  useMoveAccountMutationForUser: () => mocks.move,
}));

afterEach(cleanup);
beforeEach(() => {
  mocks.account = {
    data: { handle: '@index@ghost.example' },
    isLoading: false,
  };
  mocks.migration = {
    data: { targetApId: null, sent: false },
    isError: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.move = { mutateAsync: vi.fn().mockResolvedValue({ sent: true }), isPending: false };
});

function goToExport() {
  const exportTab = screen.getByRole('tab', { name: 'Move followers away' });
  // Radix tabs activate on mouseDown, not click alone.
  fireEvent.mouseDown(exportTab);
  fireEvent.click(exportTab);
}

function goToExportForm() {
  goToExport();
  fireEvent.click(screen.getByRole('button', { name: /I’ve added the alias/ }));
}

function enterDestination(value = 'new@elsewhere.example') {
  fireEvent.change(screen.getByLabelText('New account handle'), { target: { value } });
}

async function openMoveConfirmation() {
  fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
  return screen.findByRole('alertdialog');
}

async function confirmMove() {
  const dialog = await openMoveConfirmation();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move followers' }));
}

describe('outbound account migration', () => {
  it.each([401, 403, 404, 405, 501])(
    'hides the outbound tab for an unsupported or forbidden response (%s)',
    (statusCode) => {
      mocks.migration.isError = true;
      mocks.migration.error = { message: 'Unavailable', statusCode };
      render(<AccountMigration />);
      expect(screen.getByLabelText('Old account handle')).toBeTruthy();
      expect(screen.queryByRole('tab', { name: 'Move followers away' })).toBeNull();
      expect(screen.queryByRole('tab', { name: 'Bring followers here' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Move followers' })).toBeNull();
      expect(
        screen.getByText(/Move your followers from another social web account/).textContent,
      ).toContain('to this Ghost account');
      expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
    },
  );

  it.each([new Error('Network unavailable'), { message: 'Server error', statusCode: 500 }])(
    'offers retry after a temporary status failure',
    (error) => {
      mocks.migration.isError = true;
      mocks.migration.error = error;
      render(<AccountMigration />);
      goToExport();
      expect(screen.getByRole('alert').textContent).toContain('Could not load migration status');
      expect(screen.queryByLabelText('New account handle')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mocks.migration.refetch).toHaveBeenCalledOnce();
    },
  );

  it('hides the destination form until confirmation is clicked', () => {
    render(<AccountMigration />);
    goToExport();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
    expect(screen.getByRole('button', { name: /I’ve added the alias/ })).toBeTruthy();
    expect(screen.getByText('@index@ghost.example')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /I’ve added the alias/ }));
    expect(screen.getByLabelText('New account handle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /I’ve added the alias/ })).toBeNull();
  });

  it('asks for confirmation without a destination lookup', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('  new@elsewhere.example  ');
    const dialog = await openMoveConfirmation();
    expect(dialog.textContent).toContain(
      'Your followers will be asked to follow @new@elsewhere.example instead. This can’t be undone.',
    );
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move followers' }));
    await waitFor(() =>
      expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@new@elsewhere.example'),
    );
  });

  it('does not send the move when confirmation is cancelled', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    const dialog = await openMoveConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects moving to this Ghost account', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('index@ghost.example');
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Enter a different account than this Ghost account.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('keeps the destination locked while submitting', () => {
    mocks.move.isPending = true;
    mocks.migration.data = {
      targetApId: 'https://elsewhere.example/users/new',
      sent: false,
    };
    render(<AccountMigration />);
    goToExport();
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /Move followers/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows the alias requirement when the server rejects an unverified destination', async () => {
    mocks.move.mutateAsync.mockRejectedValue({
      message: 'Alias required',
      statusCode: 422,
    });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    await confirmMove();
    await screen.findByText('Add this Ghost account as an alias on the destination profile first.');
    expect(screen.getByLabelText('New account handle').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a conflict message when a move is already in progress elsewhere', async () => {
    mocks.move.mutateAsync.mockRejectedValue({
      message: 'Conflict',
      statusCode: 409,
    });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    await confirmMove();
    await screen.findByText('A move is already in progress or was sent to a different account.');
    expect(screen.getByLabelText('New account handle').getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects invalid handles before opening confirmation', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('not-a-handle');
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Enter a valid destination handle, like new@mastodon.social.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('prefills a pending Mastodon-style destination and shows only status after sending', () => {
    mocks.migration.data = {
      targetApId: 'https://elsewhere.example/users/new',
      sent: false,
    };
    const { rerender } = render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move to new@elsewhere.example is still in progress',
    );
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).value).toBe(
      'new@elsewhere.example',
    );
    mocks.migration.data = {
      targetApId: 'https://elsewhere.example/users/new',
      sent: true,
    };
    rerender(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'Your followers were asked to follow new@elsewhere.example',
    );
    expect(screen.queryByText(/as an alias on your new social web profile first/)).toBeNull();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
  });

  it('does not prefill or show a non-Mastodon actor URI as a handle', () => {
    mocks.migration.data = {
      targetApId: 'https://ghost.example/.ghost/activitypub/users/index',
      sent: false,
    };
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move is still in progress. Enter the destination handle and try sending it again.',
    );
    expect(screen.getByRole('status').textContent).not.toContain('/.ghost/activitypub/users/');
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).value).toBe('');
  });

  it('falls back when the Ghost handle fails to load', () => {
    mocks.account.data = undefined;
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByText('your Ghost handle')).toBeTruthy();
    expect(screen.getByText(/as an alias on your new social web profile first/)).toBeTruthy();
  });

  it('shows a loading skeleton while migration status is loading', () => {
    mocks.migration.isLoading = true;
    mocks.migration.data = undefined;
    render(<AccountMigration />);
    goToExport();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
    expect(screen.queryByRole('button', { name: /I’ve added the alias/ })).toBeNull();
  });
});
