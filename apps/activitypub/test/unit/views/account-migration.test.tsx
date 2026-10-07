import AccountMigration from '../../../src/views/preferences/components/account-migration';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  migration: {
    data: { targetApId: null as string | null, sent: false },
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  lookup: { mutateAsync: vi.fn(), isPending: false },
  move: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('@src/components/layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useAccountAliasesForUser: () => ({
    data: { aliases: [], destination: { handle: '@index@ghost.example' } },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAddAccountAliasMutationForUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveAccountAliasMutationForUser: () => ({ mutateAsync: vi.fn() }),
  useAccountMigrationForUser: () => mocks.migration,
  useLookupAccountMutationForUser: () => mocks.lookup,
  useMoveAccountMutationForUser: () => mocks.move,
}));

afterEach(cleanup);
beforeEach(() => {
  mocks.migration = {
    data: { targetApId: null, sent: false },
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.lookup = {
    mutateAsync: vi.fn().mockResolvedValue({ handle: '@new@elsewhere.example' }),
    isPending: false,
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
    'hides the outbound flow for an unsupported or forbidden response (%s)',
    (statusCode) => {
      mocks.migration.isError = true;
      mocks.migration.error = { message: 'Unavailable', statusCode };
      render(<AccountMigration />);
      expect(screen.getByLabelText('Old account handle')).toBeTruthy();
      goToExport();
      expect(screen.queryByRole('button', { name: /I’ve added the alias/ })).toBeNull();
      expect(screen.queryByLabelText('New account handle')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Move followers' })).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: /I’ve added the alias/ }));
    expect(screen.getByLabelText('New account handle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /I’ve added the alias/ })).toBeNull();
  });

  it('looks up the destination before asking for confirmation', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('  new@elsewhere.example  ');
    const dialog = await openMoveConfirmation();
    expect(mocks.lookup.mutateAsync).toHaveBeenCalledWith('@new@elsewhere.example');
    expect(dialog.textContent).toContain('I understand this move cannot simply be undone.');
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move followers' }));
    await waitFor(() =>
      expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@new@elsewhere.example'),
    );
  });

  it('shows a not-found error before opening the confirmation dialog', async () => {
    mocks.lookup.mutateAsync.mockRejectedValue({
      message: 'Not found',
      statusCode: 404,
    });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Could not find that profile. Check the handle and try again.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('keeps the destination locked while submitting', () => {
    mocks.move.isPending = true;
    mocks.migration.data.targetApId = 'https://elsewhere.example/users/new';
    render(<AccountMigration />);
    goToExport();
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /Move followers/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows the alias requirement when the server rejects an unverified destination', async () => {
    mocks.move.mutateAsync.mockRejectedValue({ statusCode: 422 });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    await confirmMove();
    await screen.findByText('Add this Ghost account as an alias on the destination profile first.');
    expect(screen.getByLabelText('New account handle').getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects invalid handles before looking up the destination', async () => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination('not-a-handle');
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Enter a valid destination handle, like new@mastodon.social.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.lookup.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the fixed pending destination and replaces the form after sending', () => {
    mocks.migration.data.targetApId = 'https://elsewhere.example/users/new';
    const { rerender } = render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move to https://elsewhere.example/users/new is pending',
    );
    mocks.migration.data.sent = true;
    rerender(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'Migration sent to https://elsewhere.example/users/new',
    );
    expect(screen.queryByLabelText('New account handle')).toBeNull();
  });
});
