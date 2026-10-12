import AccountMigration from '../../../src/views/preferences/components/account-migration';
import React from 'react';
import { getOutboundMigrationAvailability } from '../../../src/views/preferences/components/account-migration/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  account: {
    data: { handle: '@index@ghost.example' } as { handle: string } | undefined,
    isLoading: false,
  },
  migration: {
    data: {
      targetApId: null as string | null,
      targetHandle: null as string | null,
      sent: false,
    } as { targetApId: string | null; targetHandle: string | null; sent: boolean } | undefined,
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
    data: { targetApId: null, targetHandle: null, sent: false },
    isError: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.move = { mutateAsync: vi.fn().mockResolvedValue({ sent: true }), isPending: false };
});

function goToExport() {
  const exportTab = screen.getByRole('tab', { name: 'Export' });
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
      expect(screen.queryByRole('tab', { name: 'Export' })).toBeNull();
      expect(screen.queryByRole('tab', { name: 'Import' })).toBeNull();
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
      mocks.migration.data = undefined;
      mocks.migration.isError = true;
      mocks.migration.error = error;
      render(<AccountMigration />);
      expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
      goToExport();
      expect(screen.getByRole('alert').textContent).toContain('Could not load migration status');
      expect(screen.queryByLabelText('New account handle')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mocks.migration.refetch).toHaveBeenCalledOnce();
    },
  );

  it('only promises outbound moves once the migration status has loaded', () => {
    mocks.migration = { ...mocks.migration, data: undefined, isLoading: true };
    const { rerender } = render(<AccountMigration />);
    expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
    expect(screen.getByRole('tab', { name: 'Export' })).toBeTruthy();

    mocks.migration = {
      ...mocks.migration,
      data: { targetApId: null, targetHandle: null, sent: false },
      isLoading: false,
    };
    rerender(<AccountMigration />);
    expect(screen.getByText(/or from this account to somewhere else/)).toBeTruthy();
  });

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
      'Your followers will be directed to @new@elsewhere.example instead.',
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
      targetHandle: '@new@elsewhere.example',
      sent: false,
    };
    render(<AccountMigration />);
    goToExport();
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /Move followers/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('explains a server-rejected move to this account before the Ghost handle loads', async () => {
    mocks.account.data = undefined;
    mocks.move.mutateAsync.mockRejectedValue({
      message: 'Destination is this account',
      statusCode: 400,
      code: 'SELF_MOVE',
    });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('index@ghost.example');
    await confirmMove();
    await screen.findByText('Enter a different account than this Ghost account.');
  });

  it('keeps the generic message for other rejected handles', async () => {
    mocks.move.mutateAsync.mockRejectedValue({
      message: 'Invalid destination handle',
      statusCode: 400,
    });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('new@localhost');
    await confirmMove();
    await screen.findByText('Enter a valid destination handle.');
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

  it('prefills a pending destination with its stored handle and shows only status after sending', () => {
    // Misskey actor URLs hold an internal ID rather than the username
    mocks.migration.data = {
      targetApId: 'https://misskey.io/users/9h5x0a1b2c',
      targetHandle: '@new@misskey.io',
      sent: false,
    };
    const { rerender } = render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move to @new@misskey.io is in progress',
    );
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).value).toBe(
      '@new@misskey.io',
    );
    mocks.migration.data = {
      targetApId: 'https://misskey.io/users/9h5x0a1b2c',
      targetHandle: '@new@misskey.io',
      sent: true,
    };
    rerender(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'Your followers were directed to follow @new@misskey.io',
    );
    expect(screen.queryByText(/as an alias on your new social web profile first/)).toBeNull();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
  });

  it('does not guess a handle from the actor URL when none was stored', () => {
    mocks.migration.data = {
      targetApId: 'https://elsewhere.example/users/new',
      targetHandle: null,
      sent: false,
    };
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move is in progress. Enter the destination handle and try sending it again.',
    );
    const input = screen.getByLabelText('New account handle') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.readOnly).toBe(false);
  });

  it('retries a pending move to its stored destination', async () => {
    mocks.migration.data = {
      targetApId: 'https://misskey.io/users/9h5x0a1b2c',
      targetHandle: '@new@misskey.io',
      sent: false,
    };
    render(<AccountMigration />);
    goToExport();
    const input = screen.getByLabelText('New account handle') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    enterDestination('other@elsewhere.example');
    expect(input.value).toBe('@new@misskey.io');
    await confirmMove();
    expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@new@misskey.io');
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

describe('getOutboundMigrationAvailability', () => {
  const status = { targetApId: null, targetHandle: null, sent: false };

  it('is available once the status has loaded', () => {
    expect(getOutboundMigrationAvailability({ data: status, error: null })).toBe('available');
  });

  it('is unknown while loading or after a temporary failure', () => {
    expect(getOutboundMigrationAvailability({ data: undefined, error: null })).toBe('unknown');
    expect(
      getOutboundMigrationAvailability({
        data: undefined,
        error: { message: 'Server error', statusCode: 500 },
      }),
    ).toBe('unknown');
  });

  it('is unavailable when forbidden, even with a cached status', () => {
    expect(
      getOutboundMigrationAvailability({
        data: status,
        error: { message: 'Forbidden', statusCode: 403 },
      }),
    ).toBe('unavailable');
  });
});
