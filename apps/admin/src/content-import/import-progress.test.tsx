import type { ConfirmationContextType } from '@/settings/providers/confirmation-context';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ImportProgressCards } from './import-progress';
import { importProgressLabel, importPercentage, type TrackedImport } from './progress';

const { config, stop, confirm, invalidate, handleError, info, pending, useProgress } = vi.hoisted(
  () => ({
    useProgress: vi.fn(),
    config: vi.fn(),
    stop: vi.fn(),
    confirm: vi.fn<ConfirmationContextType['confirm']>(),
    invalidate: vi.fn(),
    handleError: vi.fn(),
    info: vi.fn(),
    pending: vi.fn<() => boolean>(),
  }),
);
vi.mock('./use-import-progress', () => ({ useImportProgress: useProgress }));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({ useBrowseConfig: config }));
vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
  useStopContentCSVImport: () => ({ mutateAsync: stop, isPending: pending() }),
}));
vi.mock('@tryghost/admin-x-framework', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useHandleError: () => handleError }));
vi.mock('@/settings/providers/confirmation-context', () => ({
  useConfirmation: () => ({ confirm }),
}));
vi.mock('sonner', () => ({ toast: { info } }));
beforeEach(() => {
  vi.resetAllMocks();
  config.mockReturnValue({ data: { config: {} } });
  stop.mockResolvedValue({ meta: { status: 'cancelling' } });
  invalidate.mockResolvedValue(undefined);
});

const dismiss = vi.fn();

const progress: TrackedImport = {
  import_id: 'abc',
  status: 'running',
  processed: 62,
  total: 100,
  stale: false,
};
function show(items: TrackedImport[]) {
  useProgress.mockReturnValue({ imports: items, dismiss });
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
  {
    status: 'cancelling' as const,
    label: 'Stopping…',
    description: /Already imported content will be kept/,
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

it.each(['queued', 'running'] as const)(
  'confirms stopping a %s import and refreshes progress',
  async (status) => {
    config.mockReturnValue({ data: { config: { contentImport: { cancellation: true } } } });
    show([{ ...progress, status }]);
    fireEvent.click(screen.getByRole('button', { name: 'Stop import' }));
    expect(stop).not.toHaveBeenCalled();
    const options = confirm.mock.calls[0][0];
    expect(options).toMatchObject({
      title: 'Stop this import?',
      cancelLabel: 'Keep importing',
      okLabel: 'Stop import',
    });
    expect(options.prompt).toContain('Remaining rows will not be imported.');
    const remove = vi.fn();
    await act(() => options.onOk!({ remove }));
    expect(stop).toHaveBeenCalledWith(progress.import_id);
    expect(remove).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ContentCSVProgress'] });
  },
);

it.each(['finalizing', 'cancelling'] as const)('hides the stop control while %s', (status) => {
  config.mockReturnValue({ data: { config: { contentImport: { cancellation: true } } } });
  show([{ ...progress, status }]);
  expect(screen.queryByRole('button', { name: 'Stop import' })).not.toBeInTheDocument();
});

it('disables repeated requests while a stop is pending', () => {
  config.mockReturnValue({ data: { config: { contentImport: { cancellation: true } } } });
  pending.mockReturnValue(true);
  show([progress]);
  expect(screen.getByRole('button', { name: 'Stop import' })).toBeDisabled();
});

it.each([409, 500])(
  'refreshes progress and handles a %s stop response without claiming success',
  async (status) => {
    config.mockReturnValue({ data: { config: { contentImport: { cancellation: true } } } });
    const error = new APIError(new Response(null, { status }), undefined, 'Stop failed');
    stop.mockRejectedValue(error);
    show([progress]);
    fireEvent.click(screen.getByRole('button', { name: 'Stop import' }));
    const remove = vi.fn();
    await act(() => confirm.mock.calls[0][0].onOk!({ remove }));
    expect(invalidate).toHaveBeenCalledOnce();
    if (status === 409) {
      expect(remove).toHaveBeenCalledOnce();
      expect(info).toHaveBeenCalledOnce();
      expect(handleError).not.toHaveBeenCalled();
    } else {
      expect(remove).not.toHaveBeenCalled();
      expect(handleError).toHaveBeenCalledWith(error);
    }
    expect(screen.queryByText('Stopping…')).not.toBeInTheDocument();
  },
);

it('stops only the selected import when multiple cards are shown', async () => {
  config.mockReturnValue({ data: { config: { contentImport: { cancellation: true } } } });
  show([progress, { ...progress, import_id: 'other' }]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Stop import' })[1]);
  await act(() => confirm.mock.calls[0][0].onOk!({ remove: vi.fn() }));
  expect(stop).toHaveBeenCalledExactlyOnceWith('other');
});

it.each([
  { status: 'complete' as const, label: 'Complete', description: /Your import has finished/ },
  { status: 'failed' as const, label: 'Failed', description: /stopped before it could finish/ },
  {
    status: 'cancelled' as const,
    label: 'Cancelled',
    description: /posts and pages have been kept/,
  },
])('keeps a $status result until Done is clicked', ({ status, label, description }) => {
  show([{ ...progress, status }]);
  expect(screen.getByText(label)).toBeVisible();
  expect(screen.getByText(description)).toBeVisible();
  if (status === 'cancelled') {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  } else {
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  }
  expect(screen.queryByRole('button', { name: 'Stop import' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(dismiss).toHaveBeenCalledExactlyOnceWith(progress.import_id);
});

it('keeps an unknown terminal total indeterminate without animating or inventing completion', () => {
  show([{ ...progress, status: 'failed', total: null }]);
  const bar = screen.getByRole('progressbar');
  expect(bar).not.toHaveAttribute('aria-valuenow');
  expect(bar.firstElementChild).not.toHaveClass('motion-safe:animate-pulse');
});
