import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MigrationTools from './migration-tools';

const { useProgress } = vi.hoisted(() => ({
  useProgress: vi.fn<() => { imports: unknown[] }>(),
}));
vi.mock('@/content-import/api', () => ({
  useImportProgress: useProgress,
  ImportProgressCards: () => <div>Import progress</div>,
}));
vi.mock('@/settings/components/top-level-group', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock('./migration-tools/migration-tools-import', () => ({
  default: () => <button type="button">Universal import</button>,
}));
vi.mock('./migration-tools/migration-tools-export', () => ({
  default: () => <button type="button">Export data</button>,
}));

it('restores the import options when the last progress card is dismissed', () => {
  useProgress.mockReturnValue({ imports: [{}] });
  const { rerender } = render(<MigrationTools keywords={[]} />);
  expect(screen.getByText('Import progress')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Universal import' })).not.toBeInTheDocument();

  useProgress.mockReturnValue({ imports: [] });
  rerender(<MigrationTools keywords={[]} />);
  expect(screen.queryByText('Import progress')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Universal import' })).toBeVisible();
});

it('keeps the export tools available while an import is tracked', () => {
  useProgress.mockReturnValue({ imports: [{}] });
  render(<MigrationTools keywords={[]} />);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Export' }), { button: 0, ctrlKey: false });
  expect(screen.getByRole('button', { name: 'Export data' })).toBeVisible();
  expect(screen.queryByText('Import progress')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Import' }), { button: 0, ctrlKey: false });
  expect(screen.getByText('Import progress')).toBeVisible();
});
