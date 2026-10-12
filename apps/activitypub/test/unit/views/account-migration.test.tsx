import AccountMigration from '../../../src/views/preferences/components/account-migration';
import React from 'react';
import type { QueryState } from '../../utils/query-state';
import { useAccountMigrationForUser } from '@hooks/use-activity-pub-queries';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  failedQuery,
  loadedQuery,
  loadingQuery,
  refetchFailedQuery,
} from '../../utils/query-state';
import { toast } from 'sonner';

type MigrationStatus = { targetApId: string | null; targetHandle: string | null; sent: boolean };

const mocks = vi.hoisted(() => ({
  account: undefined as unknown as QueryState<{ handle: string }>,
  migration: undefined as unknown as QueryState<MigrationStatus>,
  move: undefined as unknown as { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean },
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
  useAccountMigrationForUser: vi.fn(() => mocks.migration),
  useMoveAccountMutationForUser: () => mocks.move,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const noMove: MigrationStatus = { targetApId: null, targetHandle: null, sent: false };

// Misskey actor URLs hold an internal ID rather than the username
const pendingMisskeyMove: MigrationStatus = {
  targetApId: 'https://misskey.io/users/9h5x0a1b2c',
  targetHandle: '@new@misskey.io',
  sent: false,
};

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'clipboard');
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.account = loadedQuery({ handle: '@index@ghost.example' });
  mocks.migration = loadedQuery(noMove);
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

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
}

describe('outbound account migration', () => {
  it('reads the migration status of the index account, like Settings', () => {
    render(<AccountMigration />);
    const handles = vi.mocked(useAccountMigrationForUser).mock.calls.map(([handle]) => handle);
    expect(handles.length).toBeGreaterThan(0);
    expect(new Set(handles)).toEqual(new Set(['index']));
  });

  it.each([401, 403, 404, 405, 501])(
    'hides the outbound tab when the status is unsupported or forbidden (%s)',
    (statusCode) => {
      mocks.migration = failedQuery({ message: 'Unavailable', statusCode });
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

  it.each([
    ['a network error', new Error('Network unavailable')],
    ['a server error', { message: 'Server error', statusCode: 500 }],
  ])('offers retry after %s loading the status', (_cause, error) => {
    mocks.migration = failedQuery(error);
    render(<AccountMigration />);
    expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
    goToExport();
    expect(screen.getByRole('alert').textContent).toContain('Could not load migration status');
    expect(screen.queryByLabelText('New account handle')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.migration.refetch).toHaveBeenCalledOnce();
  });

  it('hides the outbound tab when a refresh is forbidden, even with a cached status', () => {
    mocks.migration = refetchFailedQuery(noMove, { message: 'Forbidden', statusCode: 403 });
    render(<AccountMigration />);
    expect(screen.queryByRole('tab', { name: 'Export' })).toBeNull();
    expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
  });

  it('keeps Export reachable without promising outbound moves while the status loads', () => {
    mocks.migration = loadingQuery();
    render(<AccountMigration />);
    expect(screen.queryByText(/or from this account to somewhere else/)).toBeNull();
    goToExport();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
    expect(screen.queryByRole('button', { name: /I’ve added the alias/ })).toBeNull();
  });

  it('promises outbound moves once the status has loaded', () => {
    render(<AccountMigration />);
    expect(screen.getByText(/or from this account to somewhere else/)).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Export' })).toBeTruthy();
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

  it.each([
    ['not-a-handle', 'Enter a valid destination handle, like new@mastodon.social.'],
    ['index@ghost.example', 'Enter a different account than this Ghost account.'],
  ])('rejects %s before opening confirmation', async (destination, message) => {
    render(<AccountMigration />);
    goToExportForm();
    enterDestination(destination);
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText(message);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('keeps the destination locked while submitting', () => {
    mocks.migration = loadedQuery({
      targetApId: 'https://elsewhere.example/users/new',
      targetHandle: '@new@elsewhere.example',
      sent: false,
    });
    mocks.move = { mutateAsync: vi.fn(), isPending: true };
    render(<AccountMigration />);
    goToExport();
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Moving...' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('explains a server-rejected move to this account before the Ghost handle loads', async () => {
    mocks.account = loadingQuery();
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
    expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@index@ghost.example');
  });

  it.each([
    [400, 'Enter a valid destination handle.'],
    [409, 'A move is already in progress or was sent to a different account.'],
    [422, 'Add this Ghost account as an alias on the destination profile first.'],
  ])('shows the server rejection for a %s response on the field', async (statusCode, message) => {
    mocks.move.mutateAsync.mockRejectedValue({ message: 'Rejected', statusCode });
    render(<AccountMigration />);
    goToExportForm();
    enterDestination();
    await confirmMove();
    await screen.findByText(message);
    expect(screen.getByLabelText('New account handle').getAttribute('aria-invalid')).toBe('true');
  });

  it('retries a pending move to its stored destination, which cannot be edited', async () => {
    mocks.migration = loadedQuery(pendingMisskeyMove);
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move to @new@misskey.io is in progress',
    );
    const input = screen.getByLabelText('New account handle') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    enterDestination('other@elsewhere.example');
    expect(input.value).toBe('@new@misskey.io');
    await confirmMove();
    await waitFor(() => expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@new@misskey.io'));
  });

  it('shows only the status once the move has been sent', () => {
    mocks.migration = loadedQuery({ ...pendingMisskeyMove, sent: true });
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'Your followers were directed to follow @new@misskey.io',
    );
    expect(screen.queryByText(/as an alias on your new social web profile first/)).toBeNull();
    expect(screen.queryByLabelText('New account handle')).toBeNull();
  });

  it.each([
    ['pending', pendingMisskeyMove, 'A move to @new@misskey.io is in progress'],
    [
      'sent',
      { ...pendingMisskeyMove, sent: true },
      'Your followers were directed to follow @new@misskey.io',
    ],
  ])('keeps showing a %s move when a later refresh fails', (_state, status, statusText) => {
    mocks.migration = refetchFailedQuery(status, { message: 'Server error', statusCode: 500 });
    render(<AccountMigration />);
    goToExport();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(statusText);
  });

  it('confirms the Ghost handle was copied only after the copy succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<AccountMigration />);
    goToExport();
    const copyButton = screen.getByRole('button', { name: 'Copy handle' });
    fireEvent.click(copyButton);
    await waitFor(() => expect(copyButton.querySelector('.lucide-check')).not.toBeNull());
    expect(writeText).toHaveBeenCalledWith('@index@ghost.example');
  });

  it('reports a failed copy instead of confirming it', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Clipboard blocked')));
    render(<AccountMigration />);
    goToExport();
    const copyButton = screen.getByRole('button', { name: 'Copy handle' });
    fireEvent.click(copyButton);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to copy handle'));
    expect(copyButton.querySelector('.lucide-check')).toBeNull();
    expect(copyButton.querySelector('.lucide-copy')).not.toBeNull();
  });

  it('does not guess a handle from the actor URL when none was stored', () => {
    mocks.migration = loadedQuery({
      targetApId: 'https://elsewhere.example/users/new',
      targetHandle: null,
      sent: false,
    });
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByRole('status').textContent).toContain(
      'A move is in progress. Enter the destination handle and try sending it again.',
    );
    const input = screen.getByLabelText('New account handle') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.readOnly).toBe(false);
  });

  it('falls back when the Ghost handle fails to load', () => {
    mocks.account = failedQuery(new Error('Network unavailable'));
    render(<AccountMigration />);
    goToExport();
    expect(screen.getByText('your Ghost handle')).toBeTruthy();
    expect(screen.getByText(/as an alias on your new social web profile first/)).toBeTruthy();
  });
});
