import React from 'react';
import Settings from '../../../src/views/preferences/components/settings';
import type { QueryState } from '../../utils/query-state';
import { useAccountMigrationForUser } from '@hooks/use-activity-pub-queries';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { failedQuery, loadedQuery, loadingQuery } from '../../utils/query-state';

type MigrationStatus = { targetApId: string | null; targetHandle: string | null; sent: boolean };

const mocks = vi.hoisted(() => ({
  migration: undefined as unknown as QueryState<MigrationStatus>,
}));

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useAccountMigrationForUser: vi.fn(() => mocks.migration),
}));

vi.mock('@src/views/preferences/components/edit-profile', () => ({
  default: () => null,
}));

vi.mock('@src/hooks/use-app-base-path', () => ({
  useAppBasePath: () => '',
}));

vi.mock('@src/hooks/use-navigate-with-base-path', () => ({
  useNavigateWithBasePath: () => vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  Link: ({
    children,
    className,
    to,
  }: {
    children: React.ReactNode;
    className?: string;
    to: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

const noMove: MigrationStatus = { targetApId: null, targetHandle: null, sent: false };

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.migration = loadedQuery(noMove);
});

function getMigrationRow() {
  return screen.getByRole('link', { name: /Account migration/ });
}

describe('account migration setting', () => {
  it('reads the migration status of the index account, like the migration page', () => {
    render(<Settings />);
    const handles = vi.mocked(useAccountMigrationForUser).mock.calls.map(([handle]) => handle);
    expect(handles.length).toBeGreaterThan(0);
    expect(new Set(handles)).toEqual(new Set(['index']));
  });

  it('describes moves in both directions once outbound moves are available', () => {
    render(<Settings />);
    expect(getMigrationRow().textContent).toContain('Move followers in or out of this account');
  });

  it.each([
    ['while the status loads', () => loadingQuery<MigrationStatus>()],
    [
      'when the status is forbidden',
      () => failedQuery<MigrationStatus>({ message: 'Forbidden', statusCode: 403 }),
    ],
    [
      'when the migration API is missing',
      () => failedQuery<MigrationStatus>({ message: 'Not Found', statusCode: 404 }),
    ],
    [
      'after a temporary failure',
      () => failedQuery<MigrationStatus>({ message: 'Server error', statusCode: 500 }),
    ],
  ])('only describes moving followers in %s', (_state, migrationQuery) => {
    mocks.migration = migrationQuery();
    render(<Settings />);
    expect(getMigrationRow().textContent).toContain('Move followers into this account');
    expect(getMigrationRow().textContent).not.toContain('in or out');
  });
});
