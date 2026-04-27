import MembersActions from '@src/views/members/components/members-actions';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

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

const defaultProps = {
    hasFilterOrSearch: false,
    memberCount: 10,
    search: '',
    canBulkDelete: true
} as const;

const setLocation = (pathname: string, search = '') => {
    mockUseLocation.mockReturnValue({pathname, search});
};

const renderMembersActions = (props: Partial<React.ComponentProps<typeof MembersActions>> = {}) => {
    return render(
        <MembersActions
            {...defaultProps}
            {...props}
        />
    );
};

describe('MembersActions', () => {
    beforeEach(() => {
        importModalPropsRef.current = null;
        setLocation('/members');
        mockUseNavigate.mockReturnValue(vi.fn());
    });

    it('opens the import modal on the import route', () => {
        setLocation('/members/import');

        renderMembersActions({onImportComplete: vi.fn()});

        expect(importModalPropsRef.current).not.toBeNull();
        expect(importModalPropsRef.current?.open).toBe(true);
    });

    it('navigates back to members when the import route modal closes', () => {
        const navigate = vi.fn();
        setLocation('/members/import', '?filter=label%3AVIP&search=alice');
        mockUseNavigate.mockReturnValue(navigate);

        renderMembersActions();

        expect(importModalPropsRef.current).not.toBeNull();

        const handleImportClose = importModalPropsRef.current?.onClose as ((importResponse?: {importLabel?: unknown}) => void) | undefined;

        expect(handleImportClose).toBeTypeOf('function');

        handleImportClose?.();

        expect(navigate).toHaveBeenCalledWith('/members?filter=label%3AVIP&search=alice', {replace: true});
    });

    it('navigates to the imported label filter when the import route modal closes after a labeled import', () => {
        const navigate = vi.fn();
        setLocation('/members/import', '?filter=label%3AVIP&search=alice');
        mockUseNavigate.mockReturnValue(navigate);

        renderMembersActions();
        expect(importModalPropsRef.current).not.toBeNull();
        const handleImportClose = importModalPropsRef.current?.onClose as ((importResponse?: {importLabel?: {slug: string}}) => void) | undefined;
        expect(handleImportClose).toBeTypeOf('function');
        handleImportClose?.({
            importLabel: {slug: 'import-2026-03-17'}
        });
        expect(navigate).toHaveBeenCalledWith('/members?filter=label%3A%5Bimport-2026-03-17%5D', {replace: true});
    });

    it('preserves the current members list URL in the new member link', () => {
        mockUseLocation.mockReturnValue({
            pathname: '/members',
            search: '?filter=label%3AVIP&search=alice'
        });

        render(
            <MembersActions
                hasFilterOrSearch={false}
                memberCount={10}
                search=""
                canBulkDelete
            />
        );

        expect(screen.getByRole('link', {name: 'New member'})).toHaveAttribute(
            'href',
            '#/members/new?back=%2Fmembers%3Ffilter%3Dlabel%253AVIP%26search%3Dalice'
        );
    });
});
