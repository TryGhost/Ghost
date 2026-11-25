import { render, screen } from '@testing-library/react';
import { ImportProgressCards } from './import-progress';
import { importProgressLabel, importPercentage, type TrackedImport } from './progress';

const useProgress = vi.hoisted(() => vi.fn());
vi.mock('./use-import-progress', () => ({ useImportProgress: useProgress }));

const progress: TrackedImport = {
  import_id: 'abc',
  status: 'running',
  processed: 62,
  total: 100,
  stale: false,
};
function show(items: TrackedImport[]) {
  useProgress.mockReturnValue({ imports: items });
  return render(<ImportProgressCards />);
}

it('renders the combined processed percentage and background-import copy', () => {
  show([progress]);
  expect(screen.getByRole('heading', { name: 'Import progress' })).toBeVisible();
  expect(screen.getByText('62%')).toBeVisible();
  expect(screen.getByText(/You can leave this page/)).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it.each([
  { status: 'queued' as const, label: 'Queued', description: /waits to start/ },
  {
    status: 'finalizing' as const,
    label: 'Finishing…',
    description: /preparing your completion email/,
  },
  { status: 'running' as const, label: 'Importing…', description: /Importing your content/ },
])('handles $status without inventing a percentage', ({ status, label, description }) => {
  show([{ ...progress, status, total: null }]);
  expect(screen.getByText(label)).toBeVisible();
  expect(screen.getByText(description)).toBeVisible();
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
});

it('retains the last count during a temporary failure and says it is reconnecting', () => {
  show([{ ...progress, stale: true }]);
  expect(screen.getByText('Reconnecting…')).toBeVisible();
  expect(screen.getByText(/temporarily unavailable/)).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
});

it('renders no card without a known import and bounds fractional percentages', () => {
  show([]);
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(importPercentage({ ...progress, total: 0 })).toBeNull();
  expect(importPercentage({ ...progress, total: 3, processed: 2 })).toBe(66);
  expect(importPercentage({ ...progress, processed: -1 })).toBe(0);
  expect(importProgressLabel({ ...progress, processed: 101 })).toBe('100%');
});
