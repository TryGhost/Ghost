import { ShadeApp } from '@tryghost/shade/app';
import React from 'react';
import Settings, { SettingItem } from '../../../src/views/preferences/components/settings';
import type { QueryState } from '../../utils/query-state';
import { useAccountMigrationForUser } from '@hooks/use-activity-pub-queries';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { failedQuery, loadedQuery, loadingQuery } from '../../utils/query-state';

type MigrationStatus = { targetApId: string | null; targetHandle: string | null; sent: boolean };

const mocks = vi.hoisted(() => ({
  migration: undefined as unknown as QueryState<MigrationStatus>,
  outboundMoveEnabled: true,
  navigate: vi.fn(),
}));

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useAccountMigrationForUser: vi.fn(() => mocks.migration),
}));

vi.mock('@src/lib/feature-flags', () => ({
  useFeatureFlags: () => ({
    isEnabled: (flag: string) => (flag === 'outboundMove' ? mocks.outboundMoveEnabled : false),
    flags: { outboundMove: mocks.outboundMoveEnabled },
    allFlags: ['outboundMove'] as const,
  }),
}));

vi.mock('@src/views/preferences/components/edit-profile', () => ({
  default: () => null,
}));

vi.mock('@src/hooks/use-app-base-path', () => ({
  useAppBasePath: () => '',
}));

vi.mock('@src/hooks/use-navigate-with-base-path', () => ({
  useNavigateWithBasePath: () => mocks.navigate,
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
  mocks.outboundMoveEnabled = true;
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

  it('only describes moving followers in when the outboundMove feature flag is off', () => {
    mocks.outboundMoveEnabled = false;
    render(<Settings />);
    expect(getMigrationRow().textContent).toContain('Move followers into this account');
    expect(getMigrationRow().textContent).not.toContain('in or out');
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

describe.each([false, true])('preference row actions with admin7Design=%s', (admin7Design) => {
  const renderWithDesign = (children: React.ReactNode) =>
    render(
      <ShadeApp admin7Design={admin7Design} darkMode={false}>
        {children}
      </ShadeApp>,
    );
  it('uses a native button for callback settings and activates the destination once', () => {
    renderWithDesign(<Settings />);

    const action = screen.getByRole('button', { name: /Bluesky sharing/ });
    expect(action.tagName).toBe('BUTTON');
    expect(action.tabIndex).toBe(0);
    fireEvent.click(action);
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/preferences/bluesky-sharing');
  });

  it('does not invent a row action around standalone controls', () => {
    const toggle = vi.fn();
    renderWithDesign(
      <SettingItem>
        <span>Show sensitive media</span>
        <button type="button" onClick={toggle}>
          Toggle
        </button>
      </SettingItem>,
    );

    const control = screen.getByRole('button', { name: 'Toggle' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(control.parentElement?.closest('button, [role="button"]')).toBeNull();
    fireEvent.click(control);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
