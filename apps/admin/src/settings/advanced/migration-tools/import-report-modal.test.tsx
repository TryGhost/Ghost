import { fireEvent, render, screen } from '@testing-library/react';
import ImportReportModal from './import-report-modal';

const { mockNavigate, mockParams, mockFlag } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockParams: vi.fn<() => { importId?: string; filename?: string }>(),
  mockFlag: vi.fn<() => boolean>(),
}));

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFeatureFlag: () => mockFlag() }));

describe('CSV import report dialog', () => {
  const importId = 'abcdefabcdefabcdefabcdef';

  it.each(['report.csv', 'errors.csv'])('links to the protected %s download', (filename) => {
    mockFlag.mockReturnValue(true);
    mockParams.mockReturnValue({ importId, filename });
    render(<ImportReportModal />);
    const link = screen.getByRole('link', { name: `Download ${filename}` });
    expect(link).toHaveAttribute('download', filename);
    expect(link.getAttribute('href')).toContain(
      `/ghost/api/admin/posts/upload/reports/${importId}/${filename}/`,
    );
    expect(link).toHaveAttribute('referrerpolicy', 'same-origin');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
  });

  it.each([
    [false, importId, 'report.csv'],
    [true, 'invalid', 'report.csv'],
    [true, importId, 'other.csv'],
  ])('hides unavailable downloads', (enabled, id, filename) => {
    mockFlag.mockReturnValue(enabled);
    mockParams.mockReturnValue({ importId: id, filename });
    render(<ImportReportModal />);
    expect(screen.getByText('This content import report is unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
