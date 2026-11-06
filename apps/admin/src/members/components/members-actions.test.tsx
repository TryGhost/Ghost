import { TooltipProvider } from '@tryghost/shade/components';
import MembersActions from '@/members/components/members-actions';
import { exportMembers } from '@/members/components/members-actions-helpers';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render as testingLibraryRender, screen } from '@testing-library/react';
import { toast } from 'sonner';

const render = (ui: React.ReactElement) => testingLibraryRender(ui, { wrapper: TooltipProvider });

const importModalPropsRef: { current: Record<string, unknown> | null } = { current: null };
const removeLabelModalPropsRef: { current: Record<string, unknown> | null } = { current: null };
const { mockBlobDownloadFromEndpoint, mockBulkEditAsync, mockUseLocation, mockUseNavigate } =
  vi.hoisted(() => ({
    mockBlobDownloadFromEndpoint: vi.fn(),
    mockBulkEditAsync: vi.fn(),
    mockUseLocation: vi.fn(),
    mockUseNavigate: vi.fn(),
  }));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: mockUseLocation,
  useNavigate: mockUseNavigate,
}));

vi.mock('@tryghost/admin-x-framework/helpers', () => ({
  blobDownloadFromEndpoint: mockBlobDownloadFromEndpoint,
}));

vi.mock('@/members/components/bulk-action-modals', () => ({
  ImportMembersModal: (props: Record<string, unknown>) => {
    importModalPropsRef.current = props;
    return React.createElement('div', { 'data-testid': 'import-members-modal' });
  },
  AddLabelModal: () => React.createElement('div'),
  RemoveLabelModal: (props: Record<string, unknown>) => {
    removeLabelModalPropsRef.current = props;
    return React.createElement('div');
  },
  UnsubscribeModal: () => React.createElement('div'),
  DeleteModal: () => React.createElement('div'),
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
  useBrowseNewsletters: () => ({
    data: { newsletters: [] },
    isLoading: false,
  }),
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
  useBulkEditMembers: () => ({
    mutateAsync: mockBulkEditAsync,
    isPending: false,
  }),
  useBulkDeleteMembers: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const defaultProps = {
  hasFilterOrSearch: false,
  memberCount: 10,
  search: '',
  canBulkDelete: true,
} as const;

const setLocation = (pathname: string, search = '') => {
  mockUseLocation.mockReturnValue({ pathname, search });
};

const renderMembersActions = (props: Partial<React.ComponentProps<typeof MembersActions>> = {}) => {
  return render(<MembersActions {...defaultProps} {...props} />);
};

describe('MembersActions', () => {
  beforeEach(() => {
    importModalPropsRef.current = null;
    removeLabelModalPropsRef.current = null;
    mockBlobDownloadFromEndpoint.mockReset();
    mockBulkEditAsync.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    setLocation('/members');
    mockUseNavigate.mockReturnValue(vi.fn());
  });

  it('exports members via the API, letting the server name the file', async () => {
    await exportMembers(undefined, '');

    expect(mockBlobDownloadFromEndpoint).toHaveBeenCalledWith(
      '/members/upload/?limit=all',
      'members.csv',
    );
  });

  it('passes the active filter and search to the export endpoint', async () => {
    await exportMembers('label:vip', 'alice');

    expect(mockBlobDownloadFromEndpoint).toHaveBeenCalledWith(
      '/members/upload/?limit=all&filter=label%3Avip&search=alice',
      'members.csv',
    );
  });

  it('opens the import modal on the import route', () => {
    setLocation('/members/import');

    renderMembersActions({ onImportComplete: vi.fn() });

    expect(importModalPropsRef.current).not.toBeNull();
    expect(importModalPropsRef.current?.open).toBe(true);
  });

  it('navigates back to members when the import route modal closes', () => {
    const navigate = vi.fn();
    setLocation('/members/import', '?filter=label%3AVIP&search=alice');
    mockUseNavigate.mockReturnValue(navigate);

    renderMembersActions();

    expect(importModalPropsRef.current).not.toBeNull();

    const handleImportClose = importModalPropsRef.current?.onClose as
      | ((importResponse?: { importLabel?: unknown }) => void)
      | undefined;

    expect(handleImportClose).toBeTypeOf('function');

    handleImportClose?.();

    expect(navigate).toHaveBeenCalledWith('/members?filter=label%3AVIP&search=alice', {
      replace: true,
    });
  });

  it('navigates to the imported label filter when the import route modal closes after a labeled import', () => {
    const navigate = vi.fn();
    setLocation('/members/import', '?filter=label%3AVIP&search=alice');
    mockUseNavigate.mockReturnValue(navigate);

    renderMembersActions();
    expect(importModalPropsRef.current).not.toBeNull();
    const handleImportClose = importModalPropsRef.current?.onClose as
      | ((importResponse?: { importLabel?: { slug: string } }) => void)
      | undefined;
    expect(handleImportClose).toBeTypeOf('function');
    handleImportClose?.({
      importLabel: { slug: 'import-2026-03-17' },
    });
    expect(navigate).toHaveBeenCalledWith('/members?filter=label%3A%5Bimport-2026-03-17%5D', {
      replace: true,
    });
  });

  it('preserves the current members list URL in the new member link', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/members',
      search: '?filter=label%3AVIP&search=alice',
    });

    render(<MembersActions hasFilterOrSearch={false} memberCount={10} search="" canBulkDelete />);

    expect(screen.getByRole('link', { name: 'New member' })).toHaveAttribute(
      'href',
      '#/members/new?back=%2Fmembers%3Ffilter%3Dlabel%253AVIP%26search%3Dalice',
    );
  });

  it('refuses to remove several labels when the server cannot remove them together', async () => {
    renderMembersActions({ canRemoveMultipleLabels: false });
    const onConfirm = removeLabelModalPropsRef.current?.onConfirm as (
      labelIds: string[],
    ) => Promise<void>;

    await act(() => onConfirm(['label-1', 'label-2']));

    expect(mockBulkEditAsync).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to remove label', expect.anything());
  });

  it('can hide the member header actions without hiding import modal state', () => {
    renderMembersActions({ showMenu: false, showNewMember: false });

    expect(screen.queryByTestId('members-actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New member' })).not.toBeInTheDocument();
    expect(importModalPropsRef.current).not.toBeNull();
  });
});
