import MembersActions from '@src/views/members/components/members-actions';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from '@testing-library/react';

const importModalPropsRef: {current: Record<string, unknown> | null} = {current: null};
const {mockUseLocation, mockUseNavigate} = vi.hoisted(() => ({
    mockUseLocation: vi.fn(),
    mockUseNavigate: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useLocation: mockUseLocation,
    useNavigate: mockUseNavigate
}));

vi.mock('@src/views/members/components/bulk-action-modals', () => ({
    ImportMembersModal: (props: Record<string, unknown>) => {
        importModalPropsRef.current = props;
        return React.createElement('div', {'data-testid': 'import-members-modal'});
    },
    AddLabelModal: () => React.createElement('div'),
    RemoveLabelModal: () => React.createElement('div'),
    UnsubscribeModal: () => React.createElement('div'),
    DeleteModal: () => React.createElement('div')
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useBrowseNewsletters: () => ({
        data: {newsletters: []},
        isLoading: false
    })
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    useBulkEditMembers: () => ({
        mutateAsync: vi.fn(),
        isLoading: false
    }),
    useBulkDeleteMembers: () => ({
        mutate: vi.fn(),
        isLoading: false
    })
}));

describe('MembersActions', () => {
    beforeEach(() => {
        importModalPropsRef.current = null;
        mockUseLocation.mockReturnValue({
            pathname: '/members',
            search: ''
        });
        mockUseNavigate.mockReturnValue(vi.fn());
    });

    it('opens the import modal when rendered on the import route', () => {
        mockUseLocation.mockReturnValue({
            pathname: '/members/import'
        });

        render(
            <MembersActions
                hasFilterOrSearch={false}
                memberCount={10}
                search=""
                canBulkDelete
                onImportComplete={vi.fn()}
            />
        );

        expect(importModalPropsRef.current).not.toBeNull();
        expect(importModalPropsRef.current?.open).toBe(true);
    });

    it('navigates back to members when the import route modal closes', () => {
        const navigate = vi.fn();
        mockUseLocation.mockReturnValue({
            pathname: '/members/import',
            search: '?filter=label%3AVIP&search=alice'
        });
        mockUseNavigate.mockReturnValue(navigate);

        render(
            <MembersActions
                hasFilterOrSearch={false}
                memberCount={10}
                search=""
                canBulkDelete
            />
        );

        expect(importModalPropsRef.current).not.toBeNull();

        const handleImportClose = importModalPropsRef.current?.onClose as ((importResponse?: {importLabel?: unknown}) => void) | undefined;

        expect(handleImportClose).toBeTypeOf('function');

        handleImportClose?.();

        expect(navigate).toHaveBeenCalledWith('/members?filter=label%3AVIP&search=alice', {replace: true});
    });

    it('navigates to the imported label filter when the import route modal closes after a labeled import', () => {
        const navigate = vi.fn();
        mockUseLocation.mockReturnValue({
            pathname: '/members/import',
            search: '?filter=label%3AVIP&search=alice'
        });
        mockUseNavigate.mockReturnValue(navigate);

        render(
            <MembersActions
                hasFilterOrSearch={false}
                memberCount={10}
                search=""
                canBulkDelete
            />
        );
        expect(importModalPropsRef.current).not.toBeNull();
        const handleImportClose = importModalPropsRef.current?.onClose as ((importResponse?: {importLabel?: {slug: string}}) => void) | undefined;
        expect(handleImportClose).toBeTypeOf('function');
        handleImportClose?.({
            importLabel: {slug: 'import-2026-03-17'}
        });
        expect(navigate).toHaveBeenCalledWith('/members?filter=label%3A%5Bimport-2026-03-17%5D', {replace: true});
    });
});
