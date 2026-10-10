import AccountMigration from '../../../src/views/preferences/components/account-migration';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  migration: {
    data: { targetApId: null as string | null, sent: false },
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
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
  mocks.move = { mutateAsync: vi.fn().mockResolvedValue({ sent: true }), isPending: false };
});

function enterDestination(value = 'new@elsewhere.example') {
  fireEvent.change(screen.getByLabelText('New account handle'), { target: { value } });
}

function confirmMove() {
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('outbound account migration', () => {
  it.each([401, 403, 404, 405, 501])(
    'hides the outbound flow for an unsupported or forbidden response (%s)',
    (statusCode) => {
      mocks.migration.isError = true;
      mocks.migration.error = { message: 'Unavailable', statusCode };
      render(<AccountMigration />);
      expect(screen.queryByText('Move followers from Ghost')).toBeNull();
      expect(screen.getByLabelText('Old account handle')).toBeTruthy();
    },
  );

  it.each([new Error('Network unavailable'), { message: 'Server error', statusCode: 500 }])(
    'offers retry after a temporary status failure',
    (error) => {
      mocks.migration.isError = true;
      mocks.migration.error = error;
      render(<AccountMigration />);
      expect(screen.getByRole('alert').textContent).toContain('Could not load migration status');
      expect(screen.queryByLabelText('New account handle')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mocks.migration.refetch).toHaveBeenCalledOnce();
    },
  );

  it('requires confirmation and sends a normalized destination handle', async () => {
    render(<AccountMigration />);
    enterDestination('  new@elsewhere.example  ');
    const submit = screen.getByRole('button', { name: 'Move followers' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
    confirmMove();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.move.mutateAsync).toHaveBeenCalledWith('@new@elsewhere.example'),
    );
  });

  it('requires fresh confirmation after changing the destination', () => {
    render(<AccountMigration />);
    enterDestination();
    confirmMove();
    enterDestination('different@elsewhere.example');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'Move followers' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('keeps the destination and confirmation locked while submitting', () => {
    mocks.move.isPending = true;
    render(<AccountMigration />);
    expect((screen.getByLabelText('New account handle') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Sending move...' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows the alias requirement when the server rejects an unverified destination', async () => {
    mocks.move.mutateAsync.mockRejectedValue({ statusCode: 422 });
    render(<AccountMigration />);
    enterDestination();
    confirmMove();
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Add this Ghost account as an alias on the destination profile first.');
    expect(screen.getByLabelText('New account handle').getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects invalid handles before sending a request', async () => {
    render(<AccountMigration />);
    enterDestination('not-a-handle');
    confirmMove();
    fireEvent.click(screen.getByRole('button', { name: 'Move followers' }));
    await screen.findByText('Enter a valid destination handle, like new@mastodon.social.');
    expect(mocks.move.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the fixed pending destination and replaces the form after sending', () => {
    mocks.migration.data.targetApId = 'https://elsewhere.example/users/new';
    const { rerender } = render(<AccountMigration />);
    expect(screen.getByRole('status').textContent).toContain(
      'A move to https://elsewhere.example/users/new is pending',
    );
    mocks.migration.data.sent = true;
    rerender(<AccountMigration />);
    expect(screen.getByRole('status').textContent).toContain(
      'Migration sent to https://elsewhere.example/users/new',
    );
    expect(screen.queryByLabelText('New account handle')).toBeNull();
  });
});
